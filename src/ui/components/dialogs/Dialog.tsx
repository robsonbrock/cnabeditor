import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";

interface DialogProps {
  testId: string;
  title: string;
  open: boolean;
  /** Esc (evento "cancel") equivale a cancelar. */
  onCancel: () => void;
  children: ComponentChildren;
  actions: ComponentChildren;
  wide?: boolean;
}

/** Wrapper de <dialog> nativo: foco preso e Esc nativos; devolve o foco ao fechar (R12). */
export function Dialog({ testId, title, open, onCancel, children, actions, wide }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      returnFocus.current?.focus?.();
      returnFocus.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      class={wide ? "dialog dialog-wide" : "dialog"}
      data-testid={testId}
      aria-labelledby={`${testId}-title`}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      {open && (
        <>
          <h2 id={`${testId}-title`} class="dialog-title">
            {title}
          </h2>
          <div class="dialog-body">{children}</div>
          <div class="dialog-actions">{actions}</div>
        </>
      )}
    </dialog>
  );
}
