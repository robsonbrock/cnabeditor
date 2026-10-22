import type { CnabDocument, LayoutDefinition, ValidationError, ValidationReport } from "../types";
import { validateRecord } from "./record";
import { validateStructure } from "./structure";
import { validateTotals } from "./totals";

export { validateField } from "./field";
export { validateRecord } from "./record";
export { recalculateTotals } from "./totals";

export const byPosition = (a: ValidationError, b: ValidationError) => a.line - b.line || a.start - b.start;

export function buildReport(errors: ValidationError[], status: ValidationReport["status"] = "done"): ValidationReport {
  const sorted = [...errors].sort(byPosition);
  const byLine = new Map<number, ValidationError[]>();
  for (const e of sorted) {
    const list = byLine.get(e.line);
    if (list) list.push(e);
    else byLine.set(e.line, [e]);
  }
  return { errors: sorted, byLine, total: sorted.length, status };
}

/** Arquivo inteiro: campos, sequência, numeração de lote, sequenciais e totalizadores (FR-016, FR-023a). */
export function validateDocument(doc: CnabDocument, layout: LayoutDefinition): ValidationReport {
  return buildReport([
    ...doc.records.flatMap((r) => validateRecord(r, layout)),
    ...validateStructure(doc, layout),
    ...validateTotals(doc, layout),
  ]);
}
