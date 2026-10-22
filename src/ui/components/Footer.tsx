import { useEffect, useState } from "preact/hooks";
import { doc, layout } from "../state/document";
import { copyToClipboard, startExport } from "../state/export";

const COPIED_MS = 2000;

/** Rodapé (FR-004, FR-027, FR-028). */
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
      <button type="button" class="primary" data-testid="export" disabled={empty} onClick={startExport}>
        Exportar
      </button>
      <button type="button" data-testid="copy" disabled={empty} onClick={async () => setCopied(await copyToClipboard())}>
        {copied ? "Copiado ✓" : "Copiar"}
      </button>
      <span class="manual">
        Referência:{" "}
        <a data-testid="manual-link" href={source.url} target="_blank" rel="noopener noreferrer">
          {source.title}
        </a>
      </span>
    </footer>
  );
}
