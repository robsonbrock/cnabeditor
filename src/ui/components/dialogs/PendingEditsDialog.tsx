import { pendingSelect, selectLine } from "../../state/document";
import { discard, updateLine } from "../../state/editSession";
import { Dialog } from "./Dialog";

/** FR-022: trocar de linha com edições não confirmadas. */
export function PendingEditsDialog() {
  const target = pendingSelect.value;
  const cancel = () => (pendingSelect.value = null);
  const proceed = (before: () => void) => () => {
    before();
    pendingSelect.value = null;
    if (target !== null) selectLine(target);
  };

  return (
    <Dialog
      testId="pending-edits-dialog"
      title="Edições pendentes"
      open={target !== null}
      onCancel={cancel}
      actions={
        <>
          <button type="button" data-testid="pending-cancel" onClick={cancel}>
            Cancelar
          </button>
          <button type="button" data-testid="pending-discard" onClick={proceed(discard)}>
            Descartar
          </button>
          <button type="button" class="primary" data-testid="pending-update" onClick={proceed(updateLine)}>
            Atualizar
          </button>
        </>
      }
    >
      <p>Há campos editados que ainda não foram gravados na linha. Atualizar a linha, descartar as edições ou cancelar a troca?</p>
    </Dialog>
  );
}
