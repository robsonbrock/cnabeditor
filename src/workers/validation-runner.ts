import { validateRecord } from "../core/validate/record";
import { validateStructure } from "../core/validate/structure";
import { validateTotals } from "../core/validate/totals";
import { resolveRecords } from "../core/resolve";
import type { CnabDocument, CnabRecord, LayoutDefinition, ValidationError } from "../core/types";

export type WorkerIn = { type: "validate"; jobId: number; records: string[] } | { type: "cancel"; jobId: number };
export type WorkerOut =
  | { type: "progress"; jobId: number; processed: number; total: number; errors: ValidationError[] }
  /** total = quantidade de erros encontrados no job. */
  | { type: "done"; jobId: number; total: number };

export const CHUNK_SIZE = 5000;

/**
 * Lógica do Worker de validação (contracts/core-api.md), separada para ser testável:
 * erros de linha em lotes de ~5.000 linhas, depois estrutura e totais; um job novo ou "cancel" interrompe o anterior.
 */
export function createValidationRunner(
  layout: LayoutDefinition,
  post: (msg: WorkerOut) => void,
  schedule: (fn: () => void) => void,
  chunkSize = CHUNK_SIZE,
) {
  let current: number | null = null;

  function start(jobId: number, contents: string[]) {
    current = jobId;
    const records: CnabRecord[] = contents.map((c, index) => ({
      index,
      original: c,
      current: c,
      terminator: "",
      definitionId: null,
      label: "?",
      batchContext: null,
    }));
    resolveRecords(records, layout);
    const doc = { records } as CnabDocument;
    const total = records.length;
    let processed = 0;
    let errorCount = 0;

    const step = () => {
      if (current !== jobId) return;
      const end = Math.min(total, processed + chunkSize);
      const errors: ValidationError[] = [];
      for (let i = processed; i < end; i++) errors.push(...validateRecord(records[i], layout));
      processed = end;
      errorCount += errors.length;
      post({ type: "progress", jobId, processed, total, errors });
      if (processed < total) {
        schedule(step);
        return;
      }
      schedule(() => {
        if (current !== jobId) return;
        const docErrors = [...validateStructure(doc, layout), ...validateTotals(doc, layout)];
        errorCount += docErrors.length;
        post({ type: "progress", jobId, processed, total, errors: docErrors });
        post({ type: "done", jobId, total: errorCount });
        current = null;
      });
    };
    schedule(step);
  }

  return {
    handle(msg: WorkerIn) {
      if (msg.type === "validate") start(msg.jobId, msg.records);
      else if (msg.jobId === current) current = null;
    },
  };
}
