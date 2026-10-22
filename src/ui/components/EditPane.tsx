import { definitionOf } from "../../core/resolve";
import { doc, layout } from "../state/document";
import { discard, isDirty, session, sessionFields, updateLine } from "../state/editSession";
import { FieldInput } from "./FieldInput";
import { Icon } from "./Icon";

/** Quadro de edição (FR-010, FR-011, FR-018a): campos da linha selecionada, na ordem das posições. */
export function EditPane() {
  const s = session.value;
  const d = doc.value;
  const rec = s && d ? d.records[s.recordIndex] : null;
  const def = rec ? definitionOf(layout.value, rec.definitionId) : null;
  const dirty = isDirty.value;
  const fields = sessionFields.value;

  return (
    <section class="pane" data-testid="edit-pane" aria-label="Quadro de edição">
      <div class="pane-header">
        {rec && d ? (
          <>
            <div class="record-heading">
              <span class="chip-label" aria-hidden="true">
                {rec.label}
              </span>
              <h2 data-testid="record-title">{def?.title ?? "Não reconhecido"}</h2>
            </div>
            <div class="pane-subtitle">
              <span data-testid="line-position">{`Linha ${rec.index + 1} de ${d.records.length}`}</span>
              {` · ${fields.length} ${fields.length === 1 ? "campo" : "campos"}`}
              {dirty && <span class="pending-note"> · edições não atualizadas</span>}
            </div>
          </>
        ) : (
          <h2>Campos da linha</h2>
        )}
      </div>
      {rec ? (
        <>
          <div class="fields-head" aria-hidden="true">
            <span>Posição</span>
            <span>Campo</span>
            <span>Valor</span>
            <span class="num">Tam.</span>
          </div>
          <div class="fields">
            {fields.map((view, i) => (
              <FieldInput key={view.def.id} view={view} first={i === 0} />
            ))}
          </div>
          <div class="edit-footer">
            <button
              type="button"
              class="btn btn-update"
              data-testid="update-line"
              disabled={!dirty}
              title="Grava os valores editados na linha selecionada do quadro principal"
              onClick={updateLine}
            >
              <Icon name="arrow-left" />
              Atualizar linha
            </button>
            <button type="button" class="btn" data-testid="discard" disabled={!dirty} onClick={discard}>
              <Icon name="undo" />
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
