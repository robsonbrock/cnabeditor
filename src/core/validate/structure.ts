import { definitionOf } from "../resolve";
import type { CnabDocument, CnabRecord, FieldDefinition, LayoutDefinition, RecordDefinition, ValidationError } from "../types";

/** Notas do manual que identificam os campos usados aqui (dados da definição, não posições). */
export const REF_LOTE = "G002";
export const REF_SEQUENCIAL = "G038";

const DIGITS = /^[0-9]+$/;

export const fieldByRef = (def: RecordDefinition, ref: string) => def.fields.find((f) => f.reference === ref);
export const read = (rec: CnabRecord, f: FieldDefinition) => rec.current.slice(f.start - 1, f.end);

/** Sequência HA → (HL → detalhes → TL)* → TA, número do lote e sequencial no lote (FR-016). */
export function validateStructure(doc: CnabDocument, layout: LayoutDefinition): ValidationError[] {
  const errors: ValidationError[] = [];
  const whole = (rec: CnabRecord) => ({ line: rec.index + 1, start: 1, end: Math.max(rec.current.length, 1), trigger: "file" as const });
  const sequence = (rec: CnabRecord, what: string) =>
    errors.push({ ...whole(rec), found: rec.label, rule: "sequence", message: `Sequência inválida: ${what}` });
  const mismatch = (rec: CnabRecord, f: FieldDefinition, rule: "batchNumber" | "recordSequence", found: string, expected: string) =>
    errors.push({
      line: rec.index + 1,
      start: f.start,
      end: f.end,
      fieldId: f.id,
      fieldName: f.name,
      found,
      expected,
      rule,
      trigger: "file",
      message:
        rule === "batchNumber"
          ? `Número do lote divergente: encontrado ${found}, esperado ${expected}`
          : `Sequencial do registro divergente: encontrado ${found}, esperado ${expected}`,
    });

  let state: "start" | "file" | "batch" | "end" = "start";
  let batches = 0;
  let batchLote: string | null = null;
  let position = 0;
  let last: CnabRecord | null = null;

  for (const rec of doc.records) {
    const def = definitionOf(layout, rec.definitionId);
    if (!def) {
      if (state === "batch") position++;
      continue;
    }
    last = rec;
    const kind = def.kind;
    if (state === "start" && kind !== "fileHeader") {
      sequence(rec, "arquivo sem Header de Arquivo");
      state = "file";
    }
    if (state === "end") sequence(rec, "registro após o Trailer de Arquivo");

    if (kind === "fileHeader") {
      if (state === "batch") sequence(rec, "lote sem Trailer de Lote");
      else if (state === "file") sequence(rec, "Header de Arquivo repetido");
      if (state !== "end") state = "file";
    } else if (kind === "batchHeader") {
      if (state === "batch") sequence(rec, "lote sem Trailer de Lote");
      if (state !== "end") state = "batch";
      batches++;
      position = 0;
    } else if (kind === "batchTrailer") {
      if (state === "file") sequence(rec, "Trailer de Lote fora de lote");
      if (state !== "end") state = "file";
    } else if (kind === "fileTrailer") {
      if (state === "batch") sequence(rec, "lote sem Trailer de Lote");
      state = "end";
    } else {
      if (state === "file") sequence(rec, "registro fora de lote");
      if (state === "batch") position++;
    }

    const loteField = fieldByRef(def, REF_LOTE);
    if (loteField && loteField.end <= rec.current.length) {
      const found = read(rec, loteField);
      const pad = (n: number) => String(n).padStart(loteField.size, "0");
      let expected: string | null = null;
      if (kind === "fileHeader") expected = pad(0);
      else if (kind === "fileTrailer") expected = "9".repeat(loteField.size);
      else if (kind === "batchHeader") expected = pad(batches);
      else if (state === "batch" || kind === "batchTrailer") expected = batchLote;
      if (kind === "batchHeader") batchLote = found;
      if (expected !== null && found !== expected) mismatch(rec, loteField, "batchNumber", found, expected);
    }

    const seqField = fieldByRef(def, REF_SEQUENCIAL);
    if (seqField && state === "batch" && kind !== "batchHeader" && seqField.end <= rec.current.length) {
      const found = read(rec, seqField);
      const expected = String(position).padStart(seqField.size, "0");
      if (DIGITS.test(found) && BigInt(found) !== BigInt(position)) mismatch(rec, seqField, "recordSequence", found, expected);
    }

    if (kind === "batchTrailer") batchLote = null;
  }

  if (last && state === "batch") sequence(last, "lote sem Trailer de Lote");
  if (last && state !== "end") sequence(last, "arquivo sem Trailer de Arquivo");
  return errors;
}
