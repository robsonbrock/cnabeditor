import { signal } from "@preact/signals";
import { decodeFile, fromPastedText, isAcceptedExtension } from "../../core/document";
import { FLAG_CHANGED, type CnabDocument, type LayoutDefinition, type RecalcChange, type ValidationError } from "../../core/types";
import { recalculateTotals } from "../../core/validate/totals";
import { febrabanCnab240 } from "../../layouts/loader";
import { hooks } from "./hooks";
import { showToast } from "./toasts";

export const layout = signal<LayoutDefinition>(febrabanCnab240);
export const doc = signal<CnabDocument | null>(null);
/** Incrementado quando flags ou conteúdo de linhas mudam sem trocar o documento. */
export const flagsVersion = signal(0);
export const selectedIndex = signal<number | null>(null);

/** Janela "Colar conteúdo" aberta. */
export const pasteOpen = signal(false);
/** Conteúdo novo aguardando confirmação de substituição (FR-008). */
export const pendingReplace = signal<{ next: CnabDocument; toast?: string } | null>(null);
/** Resultado do último "Recalcular totais" exibido no diálogo. */
export const recalcResult = signal<{ changes: RecalcChange[]; errors: ValidationError[] } | null>(null);
/** Linha aguardando a decisão do diálogo de edições pendentes (FR-022). */
export const pendingSelect = signal<number | null>(null);

export function touchLines(): void {
  flagsVersion.value++;
}

export function resetDocumentState(): void {
  doc.value = null;
  selectedIndex.value = null;
  pasteOpen.value = false;
  pendingReplace.value = null;
  pendingSelect.value = null;
  recalcResult.value = null;
  hooks.onSelect(null);
}

/** Substitui o conteúdo do quadro principal e seleciona a linha 1. */
export function setDocument(next: CnabDocument): void {
  doc.value = next;
  pendingReplace.value = null;
  pendingSelect.value = null;
  selectLine(next.records.length > 0 ? 0 : null);
  touchLines();
  hooks.onDocumentLoaded(next);
}

/** Seleciona sem consultar edições pendentes. */
export function selectLine(index: number | null): void {
  selectedIndex.value = index;
  hooks.onSelect(index);
}

/** Toda troca de seleção (clique, teclado, contador de erros) passa por aqui (FR-009f, FR-022). */
export function requestSelect(index: number): void {
  const d = doc.value;
  if (!d || index < 0 || index >= d.records.length || index === selectedIndex.value) return;
  if (hooks.isDirty()) pendingSelect.value = index;
  else selectLine(index);
}

/** Substitui direto ou pede confirmação quando há alterações (FR-008); `toast` é anunciado ao aplicar. */
function replaceOrConfirm(next: CnabDocument, toast?: string): void {
  if (doc.value && (doc.value.hasUnexportedChanges || hooks.isDirty())) {
    pendingReplace.value = { next, toast };
    return;
  }
  setDocument(next);
  if (toast) showToast("success", toast);
}

export function confirmReplace(): void {
  const pending = pendingReplace.value;
  if (!pending) return;
  setDocument(pending.next);
  if (pending.toast) showToast("success", pending.toast);
}

export function cancelReplace(): void {
  pendingReplace.value = null;
}

const lines = (n: number) => `${n} ${n === 1 ? "linha" : "linhas"}`;

/** Importação (FR-005, FR-035). */
export async function loadFromFile(file: File): Promise<void> {
  if (!isAcceptedExtension(file.name)) {
    showToast("error", "Arquivo não importado: extensão não aceita. Use .rem, .ret ou .txt");
    return;
  }
  let next: CnabDocument;
  try {
    next = decodeFile(new Uint8Array(await file.arrayBuffer()), file.name, layout.value);
  } catch {
    showToast("error", "Arquivo não importado: não foi possível ler o arquivo");
    return;
  }
  replaceOrConfirm(next, `Arquivo "${file.name}" importado: ${lines(next.records.length)}`);
}

/** Texto confirmado na janela "Colar conteúdo": vai sem alteração (FR-006b). */
export function loadFromPaste(text: string): void {
  replaceOrConfirm(fromPastedText(text, layout.value));
}

/**
 * "Recalcular totais" (FR-023b/c): só campos totalizadores; nada é criado ou removido.
 * Trailers alterados ganham o indicador "alterada" (US3-10).
 */
export function recalculate(): void {
  const d = doc.value;
  if (!d) return;
  const { records, changes, errors } = recalculateTotals(d, layout.value);
  for (const [i, text] of records) {
    d.records[i].current = text;
    d.flags[i] = text !== d.records[i].original ? d.flags[i] | FLAG_CHANGED : d.flags[i] & ~FLAG_CHANGED;
  }
  if (changes.length) {
    d.hasUnexportedChanges = true;
    doc.value = { ...d };
    touchLines();
    const sel = selectedIndex.value;
    if (sel !== null && records.has(sel) && !hooks.isDirty()) hooks.onSelect(sel);
    hooks.onContentChanged();
  }
  recalcResult.value = { changes, errors };
}
