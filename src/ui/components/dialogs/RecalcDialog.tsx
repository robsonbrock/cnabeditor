import { recalcResult } from "../../state/document";
import { Dialog } from "./Dialog";

/** Resultado de "Recalcular totais" (FR-023b): campos alterados de → para. */
export function RecalcDialog() {
  const result = recalcResult.value;
  const close = () => (recalcResult.value = null);

  return (
    <Dialog
      testId="recalc-dialog"
      title="Recalcular totais"
      open={result !== null}
      onCancel={close}
      wide
      actions={
        <button type="button" class="primary" data-testid="recalc-close" onClick={close}>
          Fechar
        </button>
      }
    >
      {result && result.changes.length === 0 && <p>Os totais já estavam corretos: não havia divergências. Nenhum byte foi alterado.</p>}
      {result && result.changes.length > 0 && (
        <>
          <p>{`${result.changes.length} campo(s) totalizador(es) recalculado(s):`}</p>
          <ul class="recalc-list">
            {result.changes.map((c) => (
              <li key={`${c.line}-${c.fieldName}`} data-testid="recalc-change">
                {`Linha ${c.line} · ${c.recordTitle} · ${c.fieldName}: `}
                <code>{c.from}</code>
                {" → "}
                <code>{c.to}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      {result && result.errors.length > 0 && (
        <ul class="recalc-list">
          {result.errors.map((e) => (
            <li key={`${e.line}-${e.fieldId}`} class="domain-no-match">{`Linha ${e.line} · ${e.message} (campo não alterado)`}</li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
