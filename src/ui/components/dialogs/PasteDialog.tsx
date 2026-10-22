import { useRef } from "preact/hooks";
import { loadFromPaste, pasteOpen } from "../../state/document";
import { Dialog } from "./Dialog";

/** "Colar conteúdo" (FR-006/FR-006b): o texto vai ao quadro principal sem nenhuma transformação. */
export function PasteDialog() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const close = () => {
    pasteOpen.value = false;
  };
  const confirm = () => {
    const text = ref.current?.value ?? "";
    close();
    loadFromPaste(text);
  };

  return (
    <Dialog
      testId="paste-dialog"
      title="Colar conteúdo"
      open={pasteOpen.value}
      onCancel={close}
      wide
      actions={
        <>
          <button type="button" data-testid="paste-cancel" onClick={close}>
            Cancelar
          </button>
          <button type="button" class="primary" data-testid="paste-confirm" onClick={confirm}>
            Confirmar
          </button>
        </>
      }
    >
      <label class="visually-hidden" for="paste-textarea">
        Conteúdo CNAB 240
      </label>
      <textarea
        id="paste-textarea"
        ref={ref}
        class="paste-textarea"
        spellcheck={false}
        autocomplete="off"
        wrap="off"
        placeholder="Cole aqui o conteúdo do arquivo CNAB 240"
      />
    </Dialog>
  );
}
