import { describeDomain } from "../../core/fields";
import type { FieldType } from "../../core/types";
import { layout } from "../state/document";
import { session, sessionFields } from "../state/editSession";

export const TYPE_TEXT: Record<FieldType, string> = {
  N: "Numérico",
  A: "Alfanumérico",
  D: "Data (DDMMAAAA)",
  H: "Hora (HHMMSS)",
  V: "Valor",
};

/** Painel de detalhes do campo em foco (FR-013, FR-014). */
export function DetailPane() {
  const s = session.value;
  const view = s?.focusedFieldId ? sessionFields.value.find((v) => v.def.id === s.focusedFieldId) : undefined;
  const def = view?.def;
  const value = def ? (s!.values[def.id] ?? "") : "";
  const domain = def ? describeDomain(def, value, layout.value) : null;

  return (
    <section class="pane" data-testid="detail-pane" aria-label="Detalhes do campo">
      <div class="pane-header">
        <span>Detalhes do campo</span>
      </div>
      {!def ? (
        <div class="empty">Coloque o cursor em um campo para ver a descrição</div>
      ) : (
        <div class="detail" aria-live="polite">
          <h3>{def.name}</h3>
          <dl>
            <dt>De / até</dt>
            <dd>{`${def.start} – ${def.end}`}</dd>
            <dt>Tamanho</dt>
            <dd>{def.size}</dd>
            <dt>Tipo</dt>
            <dd>{TYPE_TEXT[def.type]}</dd>
            {def.type === "V" && (
              <>
                <dt>Casas decimais</dt>
                <dd>{def.decimals}</dd>
              </>
            )}
            <dt>Obrigatório</dt>
            <dd>{def.required ? "Sim" : "Não"}</dd>
            {def.reference && (
              <>
                <dt>Referência</dt>
                <dd>{`Nota ${def.reference} do manual`}</dd>
              </>
            )}
          </dl>
          <p class="description">{def.description}</p>
          {domain && (
            <>
              <h4>Valores permitidos</h4>
              {domain.match === null && (
                <p class="domain-no-match" data-testid="domain-no-match">
                  {`O valor atual "${value}" não corresponde a nenhuma opção válida.`}
                </p>
              )}
              <ul class="domain-options" data-testid="domain-options">
                {domain.options.map((o) => (
                  <li key={o.code} aria-current={o === domain.match ? "true" : undefined}>
                    <code>{o.code}</code>
                    {` – ${o.meaning}`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
