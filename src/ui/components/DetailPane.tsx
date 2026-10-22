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
      <div class="pane-header pane-header-compact">
        <span class="section-label">Detalhes do campo</span>
        <span class="faint">{layout.value.name}</span>
      </div>
      {!def ? (
        <div class="empty">Coloque o cursor em um campo para ver a descrição</div>
      ) : (
        <div class="detail" aria-live="polite">
          <div class="detail-title">
            <h3>{def.name}</h3>
            {def.reference && <span class="detail-ref">{`Nota ${def.reference} do manual`}</span>}
          </div>
          <dl class="detail-facts">
            <div>
              <dt>De / até</dt>
              <dd class="mono">{`${def.start} – ${def.end}`}</dd>
            </div>
            <div>
              <dt>Tamanho</dt>
              <dd class="mono">{def.size}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{TYPE_TEXT[def.type]}</dd>
            </div>
            {def.type === "V" && (
              <div>
                <dt>Casas decimais</dt>
                <dd class="mono">{def.decimals}</dd>
              </div>
            )}
            <div>
              <dt>Obrigatório</dt>
              <dd>{def.required ? "Sim" : "Não"}</dd>
            </div>
          </dl>
          <p class="description">{def.description}</p>
          {domain && (
            <>
              <div class="domain-head">
                <h4>Valores permitidos</h4>
                <span class="muted">
                  Valor atual: <code class="current-value">{value || "(vazio)"}</code>
                </span>
              </div>
              {domain.match === null && (
                <p class="domain-no-match" data-testid="domain-no-match">
                  {`O valor atual "${value}" não corresponde a nenhuma opção válida.`}
                </p>
              )}
              <ul class="domain-options" data-testid="domain-options">
                {domain.options.map((o) => (
                  <li key={o.code} aria-current={o === domain.match ? "true" : undefined}>
                    <code>{o.code}</code>
                    <span class="sep"> – </span>
                    <span>{o.meaning}</span>
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
