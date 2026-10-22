import { cancelExport, chooseExtension, confirmExportStep, exportStep } from "../../state/export";
import { Dialog } from "./Dialog";

const MAX_LISTED = 50;

const ConfirmActions = () => (
  <>
    <button type="button" data-testid="export-cancel" onClick={cancelExport}>
      Cancelar
    </button>
    <button type="button" class="primary" data-testid="export-confirm" onClick={confirmExportStep}>
      Exportar mesmo assim
    </button>
  </>
);

/** Tipo "Não identificado": o usuário escolhe a extensão (FR-024). */
export function ExportExtDialog() {
  return (
    <Dialog
      testId="export-ext-dialog"
      title="Escolha a extensão do arquivo"
      open={exportStep.value?.step === "ext"}
      onCancel={cancelExport}
      actions={
        <>
          <button type="button" data-testid="export-cancel" onClick={cancelExport}>
            Cancelar
          </button>
          <button type="button" data-testid="ext-ret" onClick={() => chooseExtension("ret")}>
            .ret (retorno)
          </button>
          <button type="button" class="primary" data-testid="ext-rem" onClick={() => chooseExtension("rem")}>
            .rem (remessa)
          </button>
        </>
      }
    >
      <p>Não foi possível identificar se o conteúdo é remessa ou retorno. Escolha a extensão do arquivo exportado.</p>
    </Dialog>
  );
}

/** FR-026: exportar com erros exige confirmação informando a quantidade. */
export function ExportErrorsDialog() {
  const s = exportStep.value;
  return (
    <Dialog testId="export-errors-dialog" title="Exportar com erros?" open={s?.step === "errors"} onCancel={cancelExport} actions={<ConfirmActions />}>
      <p>{`O conteúdo tem ${s?.errorCount ?? 0} erro(s) de validação. O arquivo pode ser rejeitado pelo banco.`}</p>
    </Dialog>
  );
}

/** FR-025b: caracteres sem representação em ISO-8859-1 serão gravados como "?". */
export function ExportCharsetDialog() {
  const s = exportStep.value;
  const list = s?.plan?.unmappable ?? [];
  return (
    <Dialog testId="export-charset-dialog" title="Caracteres fora de ISO-8859-1" open={s?.step === "charset"} onCancel={cancelExport} actions={<ConfirmActions />}>
      <p>{`${list.length} caractere(s) não podem ser gravados em ISO-8859-1 e serão exportados como "?". O quadro principal não é alterado.`}</p>
      <ul class="recalc-list">
        {list.slice(0, MAX_LISTED).map((u) => (
          <li key={`${u.line}-${u.position}`}>
            {`Linha ${u.line}, posição ${u.position}: `}
            <code>{u.char}</code>
          </li>
        ))}
      </ul>
      {list.length > MAX_LISTED && <p class="muted">{`… e mais ${list.length - MAX_LISTED} ocorrência(s).`}</p>}
    </Dialog>
  );
}
