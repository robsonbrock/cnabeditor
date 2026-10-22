import { fieldsOf } from "../fields";
import { definitionOf, detailSegmentPos } from "../resolve";
import type { CnabRecord, LayoutDefinition, ValidationError } from "../types";
import { validateField } from "./field";

/** Regras de uma linha isolada: tamanho, registro não reconhecido e todos os campos completos. */
export function validateRecord(record: CnabRecord, layout: LayoutDefinition): ValidationError[] {
  const line = record.index + 1;
  const len = record.current.length;
  const errors: ValidationError[] = [];
  const whole = { line, start: 1, end: Math.max(len, 1), trigger: "file" as const };

  if (len !== layout.recordLength) {
    errors.push({
      ...whole,
      found: String(len),
      expected: String(layout.recordLength),
      rule: "lineLength",
      message: `Tamanho de linha inválido: ${len} caracteres, esperado ${layout.recordLength}`,
    });
  }
  const recordDef = definitionOf(layout, record.definitionId);
  if (!recordDef) {
    errors.push({ ...whole, found: record.label, rule: "unknownRecord", message: "Registro não reconhecido pelo layout" });
    return errors;
  }
  if (record.batchMismatch) {
    const pos = detailSegmentPos(layout)?.pos;
    const seg = recordDef.fields.find((f) => f.start === pos);
    const ctx = record.batchContext;
    errors.push({
      line,
      start: seg?.start ?? 1,
      end: seg?.end ?? Math.max(len, 1),
      fieldId: seg?.id,
      fieldName: seg?.name,
      found: record.label,
      trigger: "file",
      rule: "batchMismatch",
      message: ctx
        ? `Segmento ${record.label} não corresponde ao lote (Header de Lote na linha ${ctx.headerLine}, serviço ${ctx.service})`
        : `Segmento ${record.label} fora de lote`,
    });
  }
  for (const def of fieldsOf(record, layout)) {
    // Campo cortado por linha curta: o problema já é reportado por lineLength.
    if (def.end > len) continue;
    for (const e of validateField(def, record.current.slice(def.start - 1, def.end), "blur", layout, line)) {
      errors.push({ ...e, trigger: "file" });
    }
  }
  return errors;
}
