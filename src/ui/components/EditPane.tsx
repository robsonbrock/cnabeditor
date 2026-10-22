import { definitionOf } from "../../core/resolve";
import { doc, layout } from "../state/document";
import { discard, isDirty, session, sessionFields, updateLine } from "../state/editSession";
import { FieldInput } from "./FieldInput";

/** Quadro de edição (FR-010, FR-011, FR-018a): campos da linha selecionada, na ordem das posições. */
export function EditPane() {
  const s = session.value;
  const d = doc.value;
  const rec = s && d ? d.records[s.recordIndex] : null;
  const def = rec ? definitionOf(layout.value, rec.definitionId) : null;
  const dirty = isDirty.value;

  return (
    <section class="pane" data-testid="edit-pane" aria-label="Quadro de edição">
      <div class="pane-header">
        <span data-testid="record-title">{rec ? (def?.title ?? "Não reconhecido") : "Campos"}</span>
        {rec && d && (
          <span class="muted" data-testid="line-position">{`Linha ${rec.index + 1} de ${d.records.length}`}</span>
        )}
      </div>
      {rec ? (
        <>
          <div class="fields">
            {sessionFields.value.map((view, i) => (
              <FieldInput key={view.def.id} view={view} first={i === 0} />
            ))}
          </div>
          <div class="edit-footer">
            <button
              type="button"
              class="primary"
              data-testid="update-line"
              disabled={!dirty}
              title="Grava os valores editados na linha selecionada do quadro principal"
              onClick={updateLine}
            >
              <span aria-hidden="true">← </span>Atualizar linha
            </button>
            <button type="button" data-testid="discard" disabled={!dirty} onClick={discard}>
              Descartar
            </button>
          </div>
        </>
      ) : (
        <div class="empty">Selecione uma linha para ver os campos</div>
      )}
    </section>
  );
}
