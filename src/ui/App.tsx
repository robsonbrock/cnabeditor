import { useEffect, useRef } from "preact/hooks";
import { DetailPane } from "./components/DetailPane";
import { EditPane } from "./components/EditPane";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MainPane } from "./components/MainPane";
import { Splitter } from "./components/Splitter";
import { Toasts } from "./components/Toasts";
import { ExportCharsetDialog, ExportErrorsDialog, ExportExtDialog } from "./components/dialogs/ExportDialogs";
import { GeneratorDialog } from "./components/dialogs/GeneratorDialog";
import { PasteDialog } from "./components/dialogs/PasteDialog";
import { PendingEditsDialog } from "./components/dialogs/PendingEditsDialog";
import { RecalcDialog } from "./components/dialogs/RecalcDialog";
import { ReplaceContentDialog } from "./components/dialogs/ReplaceContentDialog";
import "./state/editSession";
import { prefs, setPrefs } from "./state/prefs";
import "./state/validation";

/** Mínimos utilizáveis por quadro, em px (R11). */
const MIN = { main: 320, right: 360, fields: 160, detail: 120 };

export function App() {
  const p = prefs.value;
  const workspace = useRef<HTMLElement>(null);
  const right = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = p.theme;
  }, [p.theme]);

  return (
    <div class="app">
      <Header />
      <main
        ref={workspace}
        class="workspace"
        style={{ "--split-main": `${p.splitMainPct}%`, "--split-right": `${p.splitRightPct}%` }}
      >
        <MainPane />
        <Splitter
          testId="split-main"
          orientation="vertical"
          label="Redimensionar quadro principal"
          value={p.splitMainPct}
          minBefore={MIN.main}
          minAfter={MIN.right}
          container={() => workspace.current}
          onChange={(v) => setPrefs({ splitMainPct: v }, false)}
          onCommit={(v) => setPrefs({ splitMainPct: v })}
        />
        <div class="right-column" ref={right}>
          <EditPane />
          <Splitter
            testId="split-right"
            orientation="horizontal"
            label="Redimensionar lista de campos e detalhes"
            value={p.splitRightPct}
            minBefore={MIN.fields}
            minAfter={MIN.detail}
            container={() => right.current}
            onChange={(v) => setPrefs({ splitRightPct: v }, false)}
            onCommit={(v) => setPrefs({ splitRightPct: v })}
          />
          <DetailPane />
        </div>
      </main>
      <Footer />
      <Toasts />
      <PasteDialog />
      <GeneratorDialog />
      <ReplaceContentDialog />
      <PendingEditsDialog />
      <RecalcDialog />
      <ExportExtDialog />
      <ExportErrorsDialog />
      <ExportCharsetDialog />
    </div>
  );
}
