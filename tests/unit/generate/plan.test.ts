import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planGeneration } from "../../../src/core/generate/plan";
import type { GenerationConfig, Selection } from "../../../src/core/types";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));

const sel = (variantId: string, quantity = 10): Selection => ({ variantId, quantity, auto: false });
const config = (selections: Selection[], direction: GenerationConfig["direction"] = "remessa"): GenerationConfig => ({
  direction,
  selections,
  companyAccount: {},
});

describe("planGeneration (FR-014–FR-016, data-model §4)", () => {
  it("A + J geram 2 lotes e 26 linhas", () => {
    const plan = planGeneration(config([sel("segmento-a-pagamento"), sel("segmento-j-pagamento")]), layout);
    expect(plan.batches.map((b) => b.header)).toEqual(["header-lote-pagamento-credito", "header-lote-pagamento-titulos"]);
    expect(plan.batches.map((b) => b.sets.length)).toEqual([10, 10]);
    expect(plan.estimatedLines).toBe(26);
  });

  it("N (DARF) + O vão para lotes separados (formas 16 e 11)", () => {
    const plan = planGeneration(config([sel("segmento-n-darf-pagamento"), sel("segmento-o-pagamento")]), layout);
    expect(plan.batches).toHaveLength(2);
    expect(plan.batches.map((b) => b.values.formaLancamento).sort()).toEqual(["11", "16"]);
  });

  it("variações com a mesma chave de lote compartilham o lote", () => {
    const plan = planGeneration(config([sel("segmento-n-darf-pagamento", 2), sel("segmento-n-pagamento", 3)]), layout);
    expect(plan.batches).toHaveLength(1);
    expect(plan.batches[0].sets).toHaveLength(5);
  });

  it("os valores do lote seguem a direção (operação R na remessa, T no retorno)", () => {
    expect(planGeneration(config([sel("segmento-p-cobranca")]), layout).batches[0].values.tipoOperacao).toBe("R");
    expect(planGeneration(config([sel("segmento-t-cobranca")], "retorno"), layout).batches[0].values.tipoOperacao).toBe("T");
  });

  it("dependente com quantidade menor: só os primeiros conjuntos levam o dependente (FR-014)", () => {
    const plan = planGeneration(config([sel("segmento-p-cobranca", 10), sel("segmento-q-cobranca", 5)]), layout);
    const sets = plan.batches[0].sets;
    expect(sets).toHaveLength(10);
    expect(sets.filter((s) => s.dependents.includes("segmento-q-cobranca"))).toHaveLength(5);
    expect(sets.slice(0, 5).every((s) => s.dependents.includes("segmento-q-cobranca"))).toBe(true);
  });

  it("dependentes saem na ordem do grupo (A, B, C)", () => {
    const plan = planGeneration(config([sel("segmento-c-pagamento", 2), sel("segmento-a-pagamento", 2), sel("segmento-b-pagamento", 2)]), layout);
    expect(plan.batches[0].sets[0]).toEqual({ principal: "segmento-a-pagamento", dependents: ["segmento-b-pagamento", "segmento-c-pagamento"] });
  });

  it("dependente sem o principal selecionado: o principal entra com a quantidade do dependente", () => {
    const plan = planGeneration(config([sel("segmento-q-cobranca", 4)]), layout);
    expect(plan.batches[0].sets).toHaveLength(4);
    expect(plan.batches[0].sets.every((s) => s.principal === "segmento-p-cobranca")).toBe(true);
  });

  it("dependente com lote próprio (J-52 Pix, forma 47) leva o principal para o lote dele", () => {
    const plan = planGeneration(config([sel("segmento-j-pagamento", 3), sel("segmento-j-52-pix-pagamento", 2)]), layout);
    expect(plan.batches.map((b) => [b.values.formaLancamento, b.sets.length])).toEqual([
      ["31", 3],
      ["47", 2],
    ]);
    expect(plan.batches[1].sets[0]).toEqual({ principal: "segmento-j-pagamento", dependents: ["segmento-j-52-pix-pagamento"] });
  });

  it("registros iniciais e finais entram no lote e na estimativa", () => {
    const plan = planGeneration(config([sel("segmento-f-gestao-caixa", 3)], "retorno"), layout);
    expect(plan.batches[0]).toMatchObject({ initial: ["saldo-inicial-gestao-caixa"], final: ["saldo-final-gestao-caixa"] });
    expect(plan.estimatedLines).toBe(2 + 2 + 2 + 3);
  });

  it("maxLines vem do tamanho do campo countRecords do Trailer de Arquivo (999.999)", () => {
    expect(planGeneration(config([sel("segmento-a-pagamento")]), layout).maxLines).toBe(999_999);
  });

  it("divide o lote quando passa da capacidade do Trailer de Lote (Vendor: 2 dígitos ⇒ 99 registros)", () => {
    const plan = planGeneration(config([sel("segmento-k-vendor", 200)]), layout);
    expect(plan.batches.map((b) => b.sets.length)).toEqual([97, 97, 6]);
    expect(plan.batches.every((b) => b.trailer === "trailer-lote-vendor")).toBe(true);
    expect(plan.estimatedLines).toBe(2 + 3 * 2 + 200);
  });

  it("cada lote planejado traz o seu Trailer de Lote", () => {
    const plan = planGeneration(config([sel("segmento-a-pagamento"), sel("segmento-o-pagamento")]), layout);
    expect(plan.batches.map((b) => b.trailer)).toEqual(["trailer-lote-pagamento", "trailer-lote-pagamento-tributos"]);
  });
});
