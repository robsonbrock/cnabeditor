import { fieldsOf } from "../fields";
import { definitionOf } from "../resolve";
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
  if (!definitionOf(layout, record.definitionId)) {
    errors.push({ ...whole, found: record.label, rule: "unknownRecord", message: "Registro não reconhecido pelo layout" });
    return errors;
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
