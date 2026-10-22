import { signal } from "@preact/signals";
import { buildReport, validateDocument } from "../../core/validate";
import { FLAG_ERROR, type ValidationError, type ValidationReport } from "../../core/types";
import type { WorkerIn, WorkerOut } from "../../workers/validation-runner";
import { doc, layout, requestSelect, selectedIndex, touchLines } from "./document";
import { hooks } from "./hooks";

export const report = signal<ValidationReport>(buildReport([]));
/** Campo a focar depois que a linha for selecionada (contador de erros, FR-016a). */
export const focusRequest = signal<{ line: number; fieldId?: string } | null>(null);

let worker: Worker | null | undefined;
let jobId = 0;
let pending: ValidationError[] = [];
let cursor = -1;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("../../workers/validation.worker.ts", import.meta.url), { type: "module" });
    worker?.addEventListener("message", (e: MessageEvent<WorkerOut>) => onWorkerMessage(e.data));
  } catch {
    worker = null;
  }
  return worker;
}

/** Bit 1 de flags ("com erro") a partir das linhas com erro (FR-009e). */
function applyErrorFlags(errors: ValidationError[], reset: boolean): void {
  const d = doc.value;
  if (!d) return;
  if (reset) for (let i = 0; i < d.flags.length; i++) d.flags[i] &= ~FLAG_ERROR;
  for (const e of errors) if (e.line >= 1 && e.line <= d.flags.length) d.flags[e.line - 1] |= FLAG_ERROR;
  touchLines();
}

function finish(next: ValidationReport): void {
  report.value = next;
  cursor = -1;
  applyErrorFlags(next.errors, true);
}

function onWorkerMessage(msg: WorkerOut): void {
  if (msg.jobId !== jobId) return;
  if (msg.type === "progress") {
    pending.push(...msg.errors);
    applyErrorFlags(msg.errors, false);
  } else {
    finish(buildReport(pending, "done"));
    pending = [];
  }
}

/** Valida o documento inteiro: no Worker quando disponível; senão de forma síncrona. */
export function revalidate(): void {
  const d = doc.value;
  const w = getWorker();
  if (w) w.postMessage({ type: "cancel", jobId } satisfies WorkerIn);
  jobId++;
  pending = [];
  if (!d) {
    finish(buildReport([]));
    return;
  }
  if (!w) {
    finish(validateDocument(d, layout.value));
    return;
  }
  report.value = { ...buildReport([], "running") };
  w.postMessage({ type: "validate", jobId, records: d.records.map((r) => r.current) } satisfies WorkerIn);
}

/** Contador de erros: seleciona a linha do próximo erro e pede foco no campo (FR-016a). */
export function goToNextError(): void {
  const errors = report.value.errors;
  if (!errors.length) return;
  const current = (selectedIndex.value ?? -1) + 1;
  if (cursor < 0 || errors[cursor]?.line !== current) {
    const after = errors.findIndex((e) => e.line > current);
    cursor = after >= 0 ? after : 0;
  } else {
    cursor = (cursor + 1) % errors.length;
  }
  const target = errors[cursor];
  focusRequest.value = { line: target.line, fieldId: target.fieldId };
  requestSelect(target.line - 1);
}

hooks.onDocumentLoaded = () => revalidate();
hooks.onContentChanged = () => revalidate();
