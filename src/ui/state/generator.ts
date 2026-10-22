import { computed, signal } from "@preact/signals";
import { generateMassa } from "../../core/generate/build";
import { buildCatalog } from "../../core/generate/catalog";
import { canGenerate, changeDirection, setQuantity, toggleVariant, validateConfig, type SelectionChange } from "../../core/generate/selection";
import type { CompanyAccountInput, GenerationConfig, GenerationDirection, Selection } from "../../core/types";
import type { GenIn, GenOut } from "../../workers/generation-runner";
import { loadGenerated, layout } from "./document";
import { showToast } from "./toasts";

/** Modal "Gerar massa de testes" aberta. */
export const generatorOpen = signal(false);
export const direction = signal<GenerationDirection>("remessa");
export const selections = signal<Selection[]>([]);
export const bankCode = signal("");
export const companyAccount = signal<CompanyAccountInput>({});
/** Avisos da última ação na lista (inclusão automática, ajuste de quantidade, recusa, troca de direção). */
export const notices = signal<string[]>([]);
export const running = signal(false);

export const catalog = computed(() => buildCatalog(layout.value, direction.value));
export const config = computed<GenerationConfig>(() => ({
  direction: direction.value,
  selections: selections.value,
  ...(bankCode.value ? { bankCode: bankCode.value } : {}),
  companyAccount: companyAccount.value,
}));
export const issues = computed(() => validateConfig(config.value, layout.value));
export const generateEnabled = computed(() => !running.value && canGenerate(issues.value));

/** A modal sempre abre com os valores padrão (spec, Assumptions). */
export function openGenerator(): void {
  direction.value = "remessa";
  selections.value = [];
  bankCode.value = "";
  companyAccount.value = {};
  notices.value = [];
  running.value = false;
  generatorOpen.value = true;
}

export function closeGenerator(): void {
  if (running.value) return;
  generatorOpen.value = false;
}

function apply(change: SelectionChange): void {
  selections.value = change.selections;
  notices.value = change.refused ? [change.refused] : change.notices;
}

export function toggle(variantId: string, on: boolean): void {
  apply(toggleVariant(selections.value, variantId, on, catalog.value));
}

export function setQty(variantId: string, raw: string): void {
  apply(setQuantity(selections.value, variantId, raw, catalog.value));
}

export function setDirection(next: GenerationDirection): void {
  if (next === direction.value) return;
  const change = changeDirection(selections.value, next, layout.value);
  direction.value = next;
  apply(change);
}

export function setAccount(key: keyof CompanyAccountInput, value: string): void {
  companyAccount.value = { ...companyAccount.value, [key]: value || undefined };
}

let worker: Worker | null | undefined;
let jobId = 0;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = typeof Worker === "undefined" ? null : new Worker(new URL("../../workers/generation.worker.ts", import.meta.url), { type: "module" });
    worker?.addEventListener("message", (e: MessageEvent<GenOut>) => onResult(e.data));
  } catch {
    worker = null;
  }
  return worker;
}

function randomSeed(): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  } catch {
    return Date.now() >>> 0;
  }
}

const lines = (n: number) => `${n.toLocaleString("pt-BR")} ${n === 1 ? "linha" : "linhas"}`;

function onResult(msg: GenOut): void {
  if (msg.jobId !== jobId) return;
  running.value = false;
  if (msg.type === "error") {
    showToast("error", `Massa de testes não gerada: ${msg.message}`);
    return;
  }
  generatorOpen.value = false;
  loadGenerated(msg.text, `Massa de testes gerada: ${lines(msg.lines)}`);
}

/** Gera no Worker quando disponível; senão de forma síncrona (research G7). */
export function runGeneration(): void {
  if (!generateEnabled.value) return;
  running.value = true;
  jobId++;
  const msg: GenIn = { type: "generate", jobId, config: config.value, seed: randomSeed(), today: new Date().toISOString() };
  const w = getWorker();
  if (w) {
    w.postMessage(msg);
    return;
  }
  try {
    const { text, lines: n } = generateMassa(msg.config, layout.value, { seed: msg.seed, today: new Date(msg.today) });
    onResult({ type: "done", jobId: msg.jobId, text, lines: n });
  } catch (e) {
    onResult({ type: "error", jobId: msg.jobId, message: e instanceof Error ? e.message : String(e) });
  }
}
