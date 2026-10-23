import { signal } from "@preact/signals";
import { encodeForExport, exportFileName, toClipboardText } from "../../core/export";
import type { CnabDocument, ExportPlan } from "../../core/types";
import { validateDocument } from "../../core/validate";
import { track } from "../analytics";
import { doc, layout } from "./document";
import { showToast } from "./toasts";
import { report } from "./validation";

type Ext = "rem" | "ret";
type Step = "ext" | "errors" | "charset";

/** Diálogo de exportação aberto, na ordem extensão → erros → charset (contracts/ui-contract.md). */
export const exportStep = signal<{ step: Step; errorCount: number; plan: ExportPlan | null } | null>(null);

/** `errors`: contado uma vez na primeira passagem, reaproveitado pela medição (005). */
let pending: { at: Date; ext: Ext | null; errors?: number } | null = null;

function trackExport(resultado: "concluida" | "cancelada", linhas: number): void {
  const erros = pending?.errors ?? 0;
  track("exportar_arquivo", { resultado, extensao: pending?.ext ?? "indefinida", com_erros: erros ? "sim" : "nao", erros, linhas });
}

const errorCount = () => {
  const r = report.value;
  return r.status === "done" ? r.total : validateDocument(doc.value!, layout.value).total;
};

/** Avança para o próximo diálogo necessário ou baixa o arquivo. */
function advance(from: Step | null): void {
  const d = doc.value;
  if (!d || !pending) return;
  if (!pending.ext) {
    exportStep.value = { step: "ext", errorCount: 0, plan: null };
    return;
  }
  if (from === null || from === "ext") {
    const count = errorCount();
    pending.errors = count;
    if (count > 0) {
      exportStep.value = { step: "errors", errorCount: count, plan: null };
      return;
    }
  }
  const plan = encodeForExport(d);
  if (from !== "charset" && plan.unmappable.length > 0) {
    exportStep.value = { step: "charset", errorCount: 0, plan };
    return;
  }
  exportStep.value = null;
  if (download(plan, exportFileName(pending.at, pending.ext))) trackExport("concluida", d.records.length);
  pending = null;
}

function download(plan: ExportPlan, name: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([plan.bytes as BlobPart], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    showToast("error", `Arquivo não exportado: ${e instanceof Error ? e.message : "falha ao gerar o download"}`);
    return false;
  }
  // Flags "alterada" são mantidas: comparam com o conteúdo original (data-model §5).
  doc.value!.hasUnexportedChanges = false;
  showToast("success", `Arquivo "${name}" exportado`);
  return true;
}

/** "Exportar" (FR-024): nome pelo relógio local no momento do clique (FR-024a). */
export function startExport(): void {
  const d = doc.value;
  if (!d || d.records.length === 0) return;
  const ext: Ext | null = d.direction === "remessa" ? "rem" : d.direction === "retorno" ? "ret" : null;
  pending = { at: new Date(), ext };
  advance(null);
}

export function chooseExtension(ext: Ext): void {
  if (!pending) return;
  pending.ext = ext;
  advance("ext");
}

export function confirmExportStep(): void {
  const current = exportStep.value;
  if (current) advance(current.step);
}

export function cancelExport(): void {
  exportStep.value = null;
  if (pending) trackExport("cancelada", doc.value?.records.length ?? 0);
  pending = null;
}

/** "Copiar" (FR-027): conteúdo atual com terminadores originais, sem rótulos. */
export async function copyToClipboard(): Promise<boolean> {
  const d = doc.value;
  if (!d) return false;
  const ok = await writeClipboard(d);
  track("copiar_conteudo", { resultado: ok ? "concluida" : "erro", linhas: d.records.length });
  return ok;
}

async function writeClipboard(d: CnabDocument): Promise<boolean> {
  const text = toClipboardText(d);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // contexto sem permissão: tenta o fallback abaixo
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) showToast("error", "Conteúdo não copiado: a área de transferência não está disponível");
  return ok;
}
