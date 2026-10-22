import { companyFieldLimits } from "../../../core/generate/selection";
import type { CompanyAccountInput } from "../../../core/types";
import { layout } from "../../state/document";
import {
  bankCode,
  catalog,
  closeGenerator,
  companyAccount,
  direction,
  generateEnabled,
  generatorOpen,
  issues,
  notices,
  runGeneration,
  running,
  selections,
  setAccount,
  setDirection,
  setQty,
  toggle,
} from "../../state/generator";
import { Dialog } from "./Dialog";

const ACCOUNT_FIELDS: { key: keyof CompanyAccountInput; testId: string; label: string }[] = [
  { key: "agencia", testId: "generator-agencia", label: "Agência" },
  { key: "digitoAgencia", testId: "generator-agencia-dv", label: "DV" },
  { key: "conta", testId: "generator-conta", label: "Conta" },
  { key: "digitoConta", testId: "generator-conta-dv", label: "DV" },
  { key: "digitoAgenciaConta", testId: "generator-agconta-dv", label: "DV Ag/Conta" },
];

/** Campo de texto com a mensagem de erro logo abaixo (FR-009). */
function TextField(props: { testId: string; label: string; value: string; size: number; error?: string; onInput: (v: string) => void; disabled?: boolean }) {
  const { testId, label, value, size, error, onInput, disabled } = props;
  return (
    <label class={error ? "gen-field invalid" : "gen-field"}>
      <span>{label}</span>
      <input
        data-testid={testId}
        value={value}
        size={Math.max(size, 2)}
        style={{ width: `${Math.max(size, 2) + 3}ch` }}
        inputMode="numeric"
        autocomplete="off"
        spellcheck={false}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${testId}-error` : undefined}
        onInput={(e) => onInput(e.currentTarget.value)}
      />
      {error && (
        <span class="gen-error" id={`${testId}-error`} data-testid={`${testId}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

/** "Gerar massa de testes" (contracts/ui-contract.md). */
export function GeneratorDialog() {
  const open = generatorOpen.value;
  const i = issues.value;
  const busy = running.value;
  const sel = new Map(selections.value.map((s) => [s.variantId, s]));
  const limits = companyFieldLimits(layout.value);
  const groups = catalog.value;
  const lines = i.plan.estimatedLines.toLocaleString("pt-BR");

  return (
    <Dialog
      testId="generator-dialog"
      title="Gerar massa de testes"
      open={open}
      onCancel={closeGenerator}
      wide
      actions={
        <>
          <button type="button" data-testid="generator-cancel" disabled={busy} onClick={closeGenerator}>
            Cancelar
          </button>
          <button
            type="button"
            class="primary"
            data-testid="generator-confirm"
            disabled={!generateEnabled.value}
            aria-busy={busy ? "true" : undefined}
            onClick={runGeneration}
          >
            {busy ? "Gerando…" : "Gerar"}
          </button>
        </>
      }
    >
      <form
        class="generator"
        onSubmit={(e) => {
          e.preventDefault();
          runGeneration();
        }}
      >
        <fieldset class="gen-direction" disabled={busy}>
          <legend>Tipo de arquivo</legend>
          {(["remessa", "retorno"] as const).map((d) => (
            <label key={d}>
              <input
                type="radio"
                name="generator-direction"
                data-testid={`generator-direction-${d}`}
                checked={direction.value === d}
                onChange={() => setDirection(d)}
              />
              {d === "remessa" ? "Remessa" : "Retorno"}
            </label>
          ))}
        </fieldset>

        <div class="gen-variants" data-testid="generator-variants">
          {groups.length === 0 && <p class="muted">Este layout não define segmentos para geração</p>}
          {groups.map((g) => (
            <fieldset key={g.header} class="gen-group" data-testid={`generator-group-${g.header}`} disabled={busy}>
              <legend>{g.label}</legend>
              {g.variants.map((v) => {
                const s = sel.get(v.id);
                const qtyError = i.fields[`quantity:${v.id}`];
                return (
                  <div key={v.id} class={qtyError ? "gen-variant invalid" : "gen-variant"}>
                    <label class="gen-check">
                      <input type="checkbox" data-testid={`generator-variant-${v.id}`} checked={!!s} onChange={(e) => toggle(v.id, e.currentTarget.checked)} />
                      {v.label}
                    </label>
                    {s?.auto && (
                      <span class="gen-auto" data-testid={`generator-auto-${v.id}`}>
                        incluído automaticamente
                      </span>
                    )}
                    <input
                      class="gen-qty"
                      data-testid={`generator-qty-${v.id}`}
                      aria-label={`Quantidade de ${v.label}`}
                      inputMode="numeric"
                      autocomplete="off"
                      disabled={!s}
                      value={s ? (s.input ?? String(s.quantity)) : ""}
                      aria-invalid={qtyError ? "true" : undefined}
                      aria-describedby={qtyError ? `generator-qty-${v.id}-error` : undefined}
                      onInput={(e) => setQty(v.id, e.currentTarget.value)}
                    />
                    {qtyError && (
                      <span class="gen-error" id={`generator-qty-${v.id}-error`} data-testid={`generator-qty-${v.id}-error`}>
                        {qtyError}
                      </span>
                    )}
                  </div>
                );
              })}
            </fieldset>
          ))}
        </div>

        <div class="gen-notices" data-testid="generator-notices" role="status" aria-live="polite">
          {notices.value.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>

        <fieldset class="gen-account" disabled={busy}>
          <legend>Banco e conta da empresa</legend>
          <TextField
            testId="generator-bank"
            label="Código do Banco na Compensação"
            value={bankCode.value}
            size={3}
            error={i.fields.bankCode}
            onInput={(v) => (bankCode.value = v)}
          />
          {ACCOUNT_FIELDS.map((f) => (
            <TextField
              key={f.key}
              testId={f.testId}
              label={f.label}
              value={companyAccount.value[f.key] ?? ""}
              size={limits[f.key]?.size ?? 1}
              error={i.fields[f.key]}
              onInput={(v) => setAccount(f.key, v)}
            />
          ))}
        </fieldset>

        <div class="gen-summary">
          <span data-testid="generator-estimate">{`${lines} linhas serão geradas`}</span>
          {i.warning && (
            <span class="gen-warning" data-testid="generator-warning">
              {i.warning}
            </span>
          )}
          {i.form && (
            <span class="gen-error" data-testid={i.form.startsWith("Total") ? "generator-limit" : "generator-form-error"}>
              {i.form}
            </span>
          )}
        </div>
        <button type="submit" hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
