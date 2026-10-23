import type { JSX } from "preact";
import { track } from "../analytics";
import { doc, recalculate, requestSelect, selectedIndex } from "../state/document";
import { prefs, setPrefs } from "../state/prefs";
import { openGenerator } from "../state/generator";
import { goToNextError, report } from "../state/validation";
import { openImport, openPaste } from "./Header";
import { Icon } from "./Icon";
import { VirtualLines } from "./VirtualLines";

const DIRECTION_TEXT = { remessa: "Remessa", retorno: "Retorno", unknown: "Não identificado" } as const;

/** Quadro principal (FR-003, FR-006a, FR-009*): somente leitura; só seleciona linhas. */
export function MainPane() {
  const d = doc.value;
  const r = report.value;
  const count = d?.records.length ?? 0;
  const wrap = prefs.value.wrap;
  const running = r.status === "running";
  const errorText = running ? "validando…" : `${r.total} ${r.total === 1 ? "erro" : "erros"}`;

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
      <div class="pane-toolbar">
        <div class="toolbar-group">
          {d?.fileName ? (
            <span class="file-name" title={d.fileName}>
              <Icon name="file" />
              {d.fileName}
            </span>
          ) : (
            <span class="pane-title">Conteúdo do arquivo</span>
          )}
          {d && (
            <span class="pill" data-testid="direction" data-direction={d.direction}>
              {DIRECTION_TEXT[d.direction]}
            </span>
          )}
          <span class="muted" data-testid="line-count">{`${count} ${count === 1 ? "linha" : "linhas"}`}</span>
        </div>
        <div class="toolbar-group">
          {d && (
            <button
              type="button"
              class="btn btn-sm error-count"
              data-testid="error-count"
              data-count={running ? undefined : r.total}
              title="Ir para o próximo erro"
              disabled={running || r.total === 0}
              onClick={goToNextError}
            >
              <Icon name={running || r.total > 0 ? "alert-circle" : "check"} size={14} />
              {errorText}
            </button>
          )}
          <button type="button" class="btn btn-sm" data-testid="recalc" disabled={!d || count === 0} onClick={recalculate}>
            <Icon name="refresh" size={14} />
            Recalcular totais
          </button>
          <button
            type="button"
            class="switch"
            role="switch"
            data-testid="wrap-toggle"
            aria-checked={wrap ? "true" : "false"}
            title="Quebrar linhas longas ou manter cada registro numa linha com rolagem horizontal"
            onClick={() => {
              track("alternar_quebra", { quebra: wrap ? "desligada" : "ligada" });
              setPrefs({ wrap: !wrap });
            }}
          >
            Quebrar linhas
            <span class="switch-track" aria-hidden="true">
              <span class="switch-thumb" />
            </span>
          </button>
        </div>
      </div>
      {count === 0 ? (
        <div class="empty-state">
          <div class="empty-card">
            <Icon name="file-up" size={40} />
            <h2>Não há conteúdo para exibir</h2>
            <p class="muted">Importe um arquivo CNAB 240 (.rem, .ret ou .txt), cole o conteúdo ou gere uma massa de testes.</p>
            <div class="empty-actions">
              <button type="button" class="btn btn-primary" onClick={openImport}>
                <Icon name="upload" />
                Importar arquivo
              </button>
              <button type="button" class="btn" onClick={openPaste}>
                <Icon name="clipboard" />
                Colar conteúdo
              </button>
              <button type="button" class="btn" data-testid="generate-empty" onClick={() => openGenerator("quadro_vazio")}>
                <Icon name="wand" />
                Gerar massa de testes
              </button>
            </div>
            <p class="faint">O arquivo é lido apenas no seu navegador e não é enviado a nenhum servidor.</p>
          </div>
        </div>
      ) : (
        <VirtualLines wrap={wrap} onSelect={requestSelect} onKeyDown={onKeyDown} />
      )}
    </section>
  );
}
