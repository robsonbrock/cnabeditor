import type { JSX } from "preact";
import { doc, requestSelect, selectedIndex } from "../state/document";
import { prefs } from "../state/prefs";
import { VirtualLines } from "./VirtualLines";

/** Quadro principal (FR-003, FR-006a, FR-009*): somente leitura; só seleciona linhas. */
export function MainPane() {
  const d = doc.value;
  const count = d?.records.length ?? 0;

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>, pageSize: number) => {
    // Somente leitura (FR-006a). Backspace também é bloqueado: em alguns navegadores (WebKit) ele volta
    // à página anterior, o que descartaria o conteúdo carregado.
    if (e.key === "Backspace") {
      e.preventDefault();
      return;
    }
    if (!d || !count) return;
    const current = selectedIndex.value ?? -1;
    const target: Record<string, number> = {
      ArrowDown: current + 1,
      ArrowUp: current - 1,
      Home: 0,
      End: count - 1,
      PageDown: current + pageSize,
      PageUp: current - pageSize,
    };
    if (!(e.key in target)) return;
    e.preventDefault();
    const next = Math.min(count - 1, Math.max(0, target[e.key]));
    requestSelect(next);
  };

  return (
    <section class="pane" data-testid="main-pane" aria-label="Quadro principal">
      <div class="pane-header">
        <span>
          Conteúdo · <span data-testid="line-count">{`${count} ${count === 1 ? "linha" : "linhas"}`}</span>
        </span>
        <span class="legend muted">
          <span class="changed">alterada</span>
          <span class="error">com erro</span>
        </span>
      </div>
      {count === 0 ? (
        <div class="empty">Não há conteúdo para exibir</div>
      ) : (
        <VirtualLines wrap={prefs.value.wrap} onSelect={requestSelect} onKeyDown={onKeyDown} />
      )}
    </section>
  );
}
