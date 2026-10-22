import { useRef } from "preact/hooks";
import { doc, loadFromFile, pasteOpen, recalculate } from "../state/document";
import { prefs, setPrefs } from "../state/prefs";
import { goToNextError, report } from "../state/validation";

const DIRECTION_TEXT = { remessa: "Remessa", retorno: "Retorno", unknown: "Não identificado" } as const;

export function Header() {
  const fileRef = useRef<HTMLInputElement>(null);
  const d = doc.value;
  const r = report.value;
  const errorText = r.status === "running" ? "validando…" : `${r.total} ${r.total === 1 ? "erro" : "erros"}`;

  return (
    <header class="app-header" data-testid="app-header">
      <div class="brand">
        <h1>CNAB Editor</h1>
        <p>Edite arquivos CNAB 240 com validação de campos em tempo real</p>
      </div>
      <div class="header-actions">
        <button type="button" data-testid="import" onClick={() => fileRef.current?.click()}>
          Importar
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".rem,.ret,.txt"
          data-testid="import-input"
          hidden
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) void loadFromFile(file);
          }}
        />
        <button type="button" data-testid="paste" onClick={() => (pasteOpen.value = true)}>
          Colar conteúdo
        </button>
        {d && (
          <span class="direction" data-testid="direction" data-direction={d.direction}>
            {DIRECTION_TEXT[d.direction]}
          </span>
        )}
        {d && (
          <button
            type="button"
            class="direction error-count"
            data-testid="error-count"
            data-count={r.status === "running" ? undefined : r.total}
            title="Ir para o próximo erro"
            disabled={r.status === "running" || r.total === 0}
            onClick={goToNextError}
          >
            {errorText}
          </button>
        )}
        <button type="button" data-testid="recalc" disabled={!d || d.records.length === 0} onClick={recalculate}>
          Recalcular totais
        </button>
        <button
          type="button"
          data-testid="wrap-toggle"
          aria-pressed={prefs.value.wrap ? "true" : "false"}
          title="Quebrar linhas longas ou manter cada registro numa linha com rolagem horizontal"
          onClick={() => setPrefs({ wrap: !prefs.value.wrap })}
        >
          Quebra de linha
        </button>
        <button
          type="button"
          data-testid="theme-toggle"
          aria-label={prefs.value.theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
          onClick={() => setPrefs({ theme: prefs.value.theme === "dark" ? "light" : "dark" })}
        >
          {prefs.value.theme === "dark" ? "☀ Tema claro" : "☾ Tema escuro"}
        </button>
      </div>
    </header>
  );
}
