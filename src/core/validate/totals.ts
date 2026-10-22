import { definitionOf } from "../resolve";
import type { CnabDocument, CnabRecord, FieldDefinition, LayoutDefinition, RecalcChange, RecordDefinition, TotalRule, ValidationError } from "../types";
import { fieldByRef, read, REF_LOTE } from "./structure";

const DIGITS = /^[0-9]+$/;

interface TotalCheck {
  rec: CnabRecord;
  def: RecordDefinition;
  field: FieldDefinition;
  found: string;
  /** Valor esperado com zeros à esquerda; sem padding quando estoura o campo. */
  expected: string;
  overflow: boolean;
}

/**
 * Registros de cada Trailer de Lote: do HL aberto até o TL; sem HL aberto, os registros anteriores
 * (desde o último trailer/header) com o mesmo "Lote de Serviço" do TL (R8).
 */
function batchGroups(doc: CnabDocument, layout: LayoutDefinition): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  let open: number | null = null;
  let boundary = 0;
  const loteOf = (i: number) => {
    const def = definitionOf(layout, doc.records[i].definitionId);
    const f = def && fieldByRef(def, REF_LOTE);
    return f ? read(doc.records[i], f) : null;
  };
  doc.records.forEach((rec, i) => {
    const kind = definitionOf(layout, rec.definitionId)?.kind;
    if (kind === "batchHeader") open = i;
    if (kind === "fileHeader" || kind === "fileTrailer") {
      open = null;
      boundary = i + 1;
    }
    if (kind !== "batchTrailer") return;
    if (open !== null) {
      groups.set(i, Array.from({ length: i - open + 1 }, (_, k) => open! + k));
    } else {
      const lote = loteOf(i);
      const members: number[] = [];
      for (let j = boundary; j < i; j++) if (lote !== null && loteOf(j) === lote) members.push(j);
      groups.set(i, [...members, i]);
    }
    open = null;
    boundary = i + 1;
  });
  return groups;
}

function computeExpected(t: TotalRule, members: number[], doc: CnabDocument, layout: LayoutDefinition): bigint {
  if (t.kind === "countRecords") return BigInt(members.length);
  if (t.kind === "countBatches") return BigInt(members.filter((i) => definitionOf(layout, doc.records[i].definitionId)?.kind === "batchHeader").length);
  let sum = 0n;
  for (const i of members) {
    const rec = doc.records[i];
    if (!rec.definitionId || !t.source!.records.includes(rec.definitionId)) continue;
    const f = definitionOf(layout, rec.definitionId)!.fields.find((x) => x.id === t.source!.field);
    const v = f ? read(rec, f) : "";
    if (DIGITS.test(v)) sum += BigInt(v);
  }
  return sum;
}

/** Valores esperados de todos os totalizadores existentes (FR-023a). Somas com BigInt, nunca float. */
function checkTotals(doc: CnabDocument, layout: LayoutDefinition): TotalCheck[] {
  const groups = batchGroups(doc, layout);
  const all = doc.records.map((_, i) => i);
  const checks: TotalCheck[] = [];
  doc.records.forEach((rec, i) => {
    const def = definitionOf(layout, rec.definitionId);
    if (!def?.totals) return;
    const members = def.kind === "fileTrailer" ? all : groups.get(i);
    if (!members) return;
    for (const t of def.totals) {
      const field = def.fields.find((f) => f.id === t.field)!;
      if (field.end > rec.current.length) continue;
      const raw = computeExpected(t, members, doc, layout).toString();
      const overflow = raw.length > field.size;
      checks.push({ rec, def, field, found: read(rec, field), expected: overflow ? raw : raw.padStart(field.size, "0"), overflow });
    }
  });
  return checks;
}

function toError(c: TotalCheck): ValidationError {
  const base = { line: c.rec.index + 1, start: c.field.start, end: c.field.end, fieldId: c.field.id, fieldName: c.field.name, found: c.found, expected: c.expected, trigger: "file" as const };
  return c.overflow
    ? { ...base, rule: "totalOverflow", message: `Total excede o tamanho do campo: ${c.expected} não cabe em ${c.field.size} posições` }
    : { ...base, rule: "totalMismatch", message: `Total divergente: encontrado ${c.found}, esperado ${c.expected}` };
}

export function validateTotals(doc: CnabDocument, layout: LayoutDefinition): ValidationError[] {
  return checkTotals(doc, layout)
    .filter((c) => c.overflow || c.found !== c.expected)
    .map(toError);
}

/**
 * "Recalcular totais" (FR-023b/c): só os campos totalizadores divergentes dos trailers existentes.
 * Não cria nem remove registros e não altera o documento recebido.
 */
export function recalculateTotals(
  doc: CnabDocument,
  layout: LayoutDefinition,
): { records: Map<number, string>; changes: RecalcChange[]; errors: ValidationError[] } {
  const records = new Map<number, string>();
  const changes: RecalcChange[] = [];
  const errors: ValidationError[] = [];
  for (const c of checkTotals(doc, layout)) {
    if (c.overflow) {
      errors.push(toError(c));
      continue;
    }
    if (c.found === c.expected) continue;
    const i = c.rec.index;
    const line = records.get(i) ?? c.rec.current;
    records.set(i, line.slice(0, c.field.start - 1) + c.expected + line.slice(c.field.end));
    changes.push({ line: i + 1, recordTitle: c.def.title, fieldName: c.field.name, from: c.found, to: c.expected });
  }
  return { records, changes, errors };
}
