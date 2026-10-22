import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "../../../src/core/generate/catalog";
import { canGenerate, changeDirection, setQuantity, toggleVariant, validateConfig } from "../../../src/core/generate/selection";
import type { GenerationConfig, LayoutDefinition, Selection } from "../../../src/core/types";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));
const remessa = buildCatalog(layout, "remessa");

const sel = (variantId: string, quantity = 10, input?: string): Selection => ({ variantId, quantity, auto: false, ...(input !== undefined ? { input } : {}) });
const config = (selections: Selection[], extra: Partial<GenerationConfig> = {}): GenerationConfig => ({ direction: "remessa", selections, companyAccount: {}, ...extra });

/** O mesmo layout com o campo "quantidade de registros do arquivo" de 3 posições: limite de 999 linhas. */
function withSmallTrailer(): LayoutDefinition {
  const records = layout.records.map((r) => {
    if (r.kind !== "fileTrailer") return r;
    const rule = r.totals!.find((t) => t.kind === "countRecords")!;
    return { ...r, fields: r.fields.map((f) => (f.id === rule.field ? { ...f, size: 3, end: f.start + 2 } : f)) };
  });
  return { ...layout, records };
}

describe("validateConfig (FR-005–FR-010)", () => {
  it("sem seleção: \"Marque ao menos um segmento\" e Gerar desabilitado", () => {
    const issues = validateConfig(config([]), layout);
    expect(issues.form).toBe("Marque ao menos um segmento");
    expect(canGenerate(issues)).toBe(false);
  });

  it("quantidade vazia vale 10; inválida é sinalizada por variação", () => {
    expect(validateConfig(config([sel("segmento-a-pagamento", 10, "")]), layout).plan.estimatedLines).toBe(14);
    for (const raw of ["0", "10001", "1.5", "abc", "-1"]) {
      const issues = validateConfig(config([sel("segmento-a-pagamento", 10, raw)]), layout);
      expect(issues.fields["quantity:segmento-a-pagamento"], raw).toBe("Informe um número inteiro de 1 a 10.000");
      expect(canGenerate(issues)).toBe(false);
    }
  });

  it("acima de 100.000 linhas avisa, sem bloquear", () => {
    const issues = validateConfig(config(["segmento-a-pagamento", "segmento-j-pagamento", "segmento-o-pagamento", "segmento-p-cobranca", "segmento-a-debito", "segmento-d-custodia", "segmento-h-consignacao", "segmento-k-vendor", "segmento-a-compror", "segmento-y-02-alegacao-pagador", "segmento-n-darf-pagamento"].map((id) => sel(id, 10_000))), layout);
    expect(issues.warning).toBe("110.024 linhas: a geração pode demorar");
    expect(canGenerate(issues)).toBe(true);
  });

  it("acima do limite do Trailer de Arquivo bloqueia, com o limite lido da definição (edge case)", () => {
    const small = withSmallTrailer();
    const issues = validateConfig(config([sel("segmento-a-pagamento", 996)]), small);
    expect(issues.plan.maxLines).toBe(999);
    expect(issues.form).toBe("Total de 1.000 linhas excede o limite de 999");
    expect(canGenerate(issues)).toBe(false);
    expect(validateConfig(config([sel("segmento-a-pagamento", 995)]), small).form).toBeUndefined();
  });
});

describe("dependências na seleção (FR-011–FR-013, US3)", () => {
  const ids = (s: Selection[]) => s.map((x) => `${x.variantId}:${x.quantity}${x.auto ? ":auto" : ""}`);

  it("marcar uma variação cria a seleção com quantidade 10", () => {
    expect(toggleVariant([], "segmento-a-pagamento", true, remessa).selections).toEqual([{ variantId: "segmento-a-pagamento", quantity: 10, input: "10", auto: false }]);
  });

  it("marcar Q inclui P automaticamente, com aviso (US3-1)", () => {
    const change = toggleVariant([], "segmento-q-cobranca", true, remessa);
    expect(ids(change.selections)).toEqual(["segmento-p-cobranca:10:auto", "segmento-q-cobranca:10"]);
    expect(change.notices).toEqual(["Segmento P foi incluído porque Segmento Q depende dele"]);
  });

  it("desmarcar P com Q marcado é recusado, com o motivo (US3-2)", () => {
    const { selections } = toggleVariant([], "segmento-q-cobranca", true, remessa);
    const change = toggleVariant(selections, "segmento-p-cobranca", false, remessa);
    expect(change.refused).toBe("Segmento P é necessário enquanto Segmento Q estiver marcado");
    expect(change.selections).toBe(selections);
  });

  it("desmarcar Q remove P automático, mas mantém P marcado pelo usuário (US3-3)", () => {
    const auto = toggleVariant([], "segmento-q-cobranca", true, remessa).selections;
    expect(ids(toggleVariant(auto, "segmento-q-cobranca", false, remessa).selections)).toEqual([]);
    const own = toggleVariant(toggleVariant([], "segmento-p-cobranca", true, remessa).selections, "segmento-q-cobranca", true, remessa).selections;
    expect(ids(toggleVariant(own, "segmento-q-cobranca", false, remessa).selections)).toEqual(["segmento-p-cobranca:10"]);
  });

  it("marcar o principal que estava automático torna-o do usuário", () => {
    const auto = toggleVariant([], "segmento-q-cobranca", true, remessa).selections;
    const own = toggleVariant(auto, "segmento-p-cobranca", true, remessa).selections;
    expect(ids(toggleVariant(own, "segmento-q-cobranca", false, remessa).selections)).toEqual(["segmento-p-cobranca:10"]);
  });

  it("Q = 8 com P = 5 leva P a 8, com aviso (US3-5)", () => {
    let s = toggleVariant([], "segmento-q-cobranca", true, remessa).selections;
    s = setQuantity(s, "segmento-q-cobranca", "3", remessa).selections;
    s = setQuantity(s, "segmento-p-cobranca", "5", remessa).selections;
    const change = setQuantity(s, "segmento-q-cobranca", "8", remessa);
    expect(ids(change.selections)).toEqual(["segmento-p-cobranca:8:auto", "segmento-q-cobranca:8"]);
    expect(change.notices).toEqual(["Quantidade de Segmento P ajustada para 8 para acompanhar Segmento Q"]);
  });

  it("P = 3 com Q = 8 mantém P em 8, com aviso (US3-5a)", () => {
    let s = toggleVariant([], "segmento-q-cobranca", true, remessa).selections;
    s = setQuantity(s, "segmento-q-cobranca", "8", remessa).selections;
    const change = setQuantity(s, "segmento-p-cobranca", "3", remessa);
    expect(change.selections.find((x) => x.variantId === "segmento-p-cobranca")).toMatchObject({ quantity: 8, input: "8" });
    expect(change.notices).toEqual(["Segmento P não pode ter menos registros que Segmento Q: mantido em 8"]);
  });

  it("marcar A, B e C não duplica A", () => {
    let s = toggleVariant([], "segmento-b-pagamento", true, remessa).selections;
    s = toggleVariant(s, "segmento-c-pagamento", true, remessa).selections;
    s = toggleVariant(s, "segmento-a-pagamento", true, remessa).selections;
    expect(ids(s)).toEqual(["segmento-a-pagamento:10", "segmento-b-pagamento:10", "segmento-c-pagamento:10"]);
  });
});

describe("troca de direção (US4-1)", () => {
  it("remove o que não existe em Retorno, com aviso por serviço", () => {
    let s = toggleVariant([], "segmento-q-cobranca", true, remessa).selections;
    s = toggleVariant(s, "segmento-a-pagamento", true, remessa).selections;
    const change = changeDirection(s, "retorno", layout);
    expect(change.selections.map((x) => x.variantId)).toEqual(["segmento-a-pagamento"]);
    expect(change.notices).toEqual(["Removidos por não existirem em Retorno: Cobrança: Segmento P, Segmento Q"]);
  });

  it("sem remoções, sem aviso", () => {
    const s = toggleVariant([], "segmento-a-pagamento", true, remessa).selections;
    expect(changeDirection(s, "retorno", layout)).toEqual({ selections: s, notices: [] });
  });
});
