import { useEffect, useState } from "preact/hooks";
import { doc, layout } from "../state/document";
import { copyToClipboard, startExport } from "../state/export";
import { Icon } from "./Icon";

const COPIED_MS = 2000;
const EXPORT_TEXT = { remessa: "Exportar .rem", retorno: "Exportar .ret", unknown: "Exportar" } as const;
/** Formulário de feedback (004, FR-002): endereço fixo, sem dados do documento (FR-004). */
export const FEEDBACK_URL = "https://forms.gle/vtu9hDoSFQvkiWfo6";
const FEEDBACK_LABEL = "Enviar feedback (abre o formulário em nova aba)";

/** Rodapé (FR-004, FR-027, FR-028; 004: link de feedback). */
export function Footer() {
  const d = doc.value;
  const empty = !d || d.records.length === 0;
  const [copied, setCopied] = useState(false);
  const source = layout.value.source;

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <footer class="app-footer" data-testid="app-footer">
      <div class="footer-actions">
        <button type="button" class="btn btn-primary" data-testid="export" disabled={empty} onClick={startExport}>
          <Icon name="download" />
          {EXPORT_TEXT[d?.direction ?? "unknown"]}
        </button>
        <button type="button" class="btn" data-testid="copy" disabled={empty} onClick={async () => setCopied(await copyToClipboard())}>
          <Icon name="copy" />
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
      <div class="footer-meta">
        <span class="local-only">
          <Icon name="lock" size={14} />
          Processado só no seu navegador
        </span>
        <span>
          Referência:{" "}
          <a data-testid="manual-link" href={source.url} target="_blank" rel="noopener noreferrer">
            {source.title}
            <Icon name="external" size={12} />
          </a>
        </span>
        <a
          data-testid="feedback-link"
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={FEEDBACK_LABEL}
          title={FEEDBACK_LABEL}
        >
          Enviar feedback
          <Icon name="external" size={12} />
        </a>
      </div>
    </footer>
  );
}
