import { cancelReplace, confirmReplace, pendingReplace } from "../../state/document";
import { Dialog } from "./Dialog";

/** FR-008/FR-029: substituir conteúdo com alterações não exportadas, edições pendentes ou por uma massa gerada. */
export function ReplaceContentDialog() {
  return (
    <Dialog
      testId="replace-content-dialog"
      title="Substituir conteúdo?"
      open={pendingReplace.value !== null}
      onCancel={cancelReplace}
      actions={
        <>
          <button type="button" data-testid="replace-cancel" onClick={cancelReplace}>
            Cancelar
          </button>
          <button type="button" class="primary" data-testid="replace-confirm" onClick={confirmReplace}>
            Substituir
          </button>
        </>
      }
    >
      <p>{pendingReplace.value?.message ?? "Há alterações que ainda não foram exportadas. Substituir o conteúdo atual descarta essas alterações."}</p>
    </Dialog>
  );
}
