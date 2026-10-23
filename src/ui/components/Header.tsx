import { track } from "../analytics";
import { loadFromFile, pasteOpen } from "../state/document";
import { openGenerator } from "../state/generator";
import { prefs, setPrefs } from "../state/prefs";
import { Icon, Logo } from "./Icon";

const IMPORT_INPUT_ID = "import-input";

/** Abre o seletor de arquivo do cabeçalho (também usado pelo estado vazio do quadro principal). */
export const openImport = () => document.getElementById(IMPORT_INPUT_ID)?.click();
export const openPaste = () => (pasteOpen.value = true);

/** Cabeçalho (FR-002, FR-031): marca, Importar, Colar conteúdo e tema. */
export function Header() {
  const dark = prefs.value.theme === "dark";
  const themeLabel = dark ? "Mudar para tema claro" : "Mudar para tema escuro";

  return (
    <header class="app-header" data-testid="app-header">
      <div class="brand">
        <Logo />
        <div>
          <h1>CNAB Editor</h1>
          <p>Edite arquivos CNAB 240 com validação de campos em tempo real</p>
        </div>
      </div>
      <div class="header-actions">
        <button type="button" class="btn" data-testid="import" onClick={openImport}>
          <Icon name="upload" />
          Importar arquivo
        </button>
        <input
          id={IMPORT_INPUT_ID}
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
        <button type="button" class="btn" data-testid="paste" onClick={openPaste}>
          <Icon name="clipboard" />
          Colar conteúdo
        </button>
        <button type="button" class="btn" data-testid="generate" onClick={() => openGenerator("cabecalho")}>
          <Icon name="wand" />
          Gerar massa de testes
        </button>
        <span class="divider" aria-hidden="true" />
        <button
          type="button"
          class="btn btn-icon"
          data-testid="theme-toggle"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={() => {
            track("trocar_tema", { tema: dark ? "claro" : "escuro" });
            setPrefs({ theme: dark ? "light" : "dark" });
          }}
        >
          <Icon name={dark ? "sun" : "moon"} />
        </button>
      </div>
    </header>
  );
}
