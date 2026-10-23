import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../../src/core/document";
import { generateMassa } from "../../../src/core/generate/build";
import { definitionOf } from "../../../src/core/resolve";
import { padValue } from "../../../src/core/validate/field";
import type { CnabRecord, CompanyAccountInput, GenerationConfig } from "../../../src/core/types";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));
const OPTS = { seed: 7, today: new Date(2026, 9, 22) };
const ACCOUNT: CompanyAccountInput = { agencia: "1234", digitoAgencia: "5", conta: "56789", digitoConta: "0", digitoAgenciaConta: "X" };

function generate(variants: string[], extra: Partial<GenerationConfig> = {}, direction: GenerationConfig["direction"] = "remessa") {
  const config: GenerationConfig = { direction, selections: variants.map((variantId) => ({ variantId, quantity: 5, auto: false })), companyAccount: {}, ...extra };
  return fromPastedText(generateMassa(config, layout, OPTS).text, layout).records;
}

const read = (rec: CnabRecord, id: string) => {
  const f = definitionOf(layout, rec.definitionId)!.fields.find((x) => x.id === id)!;
  return rec.current.slice(f.start - 1, f.end);
};
const accountFields = (rec: CnabRecord) =>
  definitionOf(layout, rec.definitionId)!.fields.filter((f) => ["G008", "G009", "G010", "G011", "G012"].includes(f.reference ?? ""));
const companyIds = (rec: CnabRecord): Set<string> => {
  const def = definitionOf(layout, rec.definitionId)!;
  const gen = layout.generation!;
  const listed = gen.company.records[def.id] ?? [];
  return new Set(def.fields.filter((f) => listed.includes(f.id) || (gen.company.kinds.includes(def.kind) && /^G0(0[5-9]|1[0-3])$/.test(f.reference ?? ""))).map((f) => f.id));
};

describe("banco e conta da empresa (FR-024–FR-027)", () => {
  it("Código do Banco na Compensação em todas as linhas (FR-024)", () => {
    const records = generate(["segmento-a-pagamento", "segmento-p-cobranca", "segmento-k-vendor", "segmento-r-cobranca"], { bankCode: "033" });
    for (const r of records) expect(read(r, "codigoBanco"), `linha ${r.index + 1}`).toBe("033");
  });

  it("campos de banco de terceiros não são forçados pelo banco informado", () => {
    const records = generate(["segmento-a-pagamento", "segmento-k-vendor", "segmento-r-cobranca", "segmento-y-50-cobranca"], { bankCode: "033" });
    const third = (def: string, id: string) => records.filter((r) => r.definitionId === def).map((r) => read(r, id));
    for (const [def, id] of [
      ["segmento-a-pagamento", "bancoFavorecido"],
      ["segmento-k-vendor", "bancoDebito"],
      ["segmento-r-cobranca", "bancoDebito"],
      ["segmento-y-50-cobranca", "bancoBeneficiario"],
    ]) {
      const values = third(def, id);
      expect(values.length, def).toBeGreaterThan(0);
      expect(values.every((v) => v === "033"), `${def}.${id}`).toBe(false);
    }
  });

  it("agência e conta informadas em todo campo da empresa: HA, HL, P, Y-50 (FR-025)", () => {
    const records = generate(["segmento-a-pagamento", "segmento-p-cobranca", "segmento-y-50-cobranca"], { companyAccount: ACCOUNT });
    let checked = 0;
    for (const r of records) {
      const ids = companyIds(r);
      for (const f of accountFields(r).filter((x) => ids.has(x.id))) {
        const raw = { G008: "1234", G009: "5", G010: "56789", G011: "0", G012: "X" }[f.reference!]!;
        expect(read(r, f.id), `${r.definitionId}.${f.id}`).toBe(padValue(f, raw));
        checked++;
      }
    }
    const p = records.find((r) => r.definitionId === "segmento-p-cobranca")!;
    expect(read(p, "agencia")).toBe("01234");
    expect(read(p, "conta")).toBe("000000056789");
    expect(checked).toBeGreaterThan(20);
  });

  it("vale também em retorno: E, T e trailers de conciliação e gestão de caixa", () => {
    const records = generate(["segmento-e-conciliacao", "segmento-t-cobranca", "segmento-f-gestao-caixa"], { companyAccount: ACCOUNT }, "retorno");
    for (const def of ["segmento-e-conciliacao", "segmento-t-cobranca", "trailer-lote-conciliacao", "trailer-lote-gestao-caixa"]) {
      const r = records.find((x) => x.definitionId === def)!;
      expect(r, def).toBeDefined();
      const f = (id: string) => definitionOf(layout, def)!.fields.find((x) => x.id === id)!;
      // Campo transcrito como alfanumérico recebe o preenchimento padrão do editor (espaços à direita).
      expect(read(r, "agencia"), def).toBe(padValue(f("agencia"), "1234"));
      expect(read(r, "conta"), def).toBe(padValue(f("conta"), "56789"));
    }
  });

  it("contas de terceiros variam e não recebem os dados da empresa (FR-026)", () => {
    const records = generate(["segmento-a-pagamento", "segmento-a-debito", "segmento-y-50-cobranca"], { companyAccount: ACCOUNT });
    for (const [def, id] of [
      ["segmento-a-pagamento", "contaFavorecido"],
      ["segmento-a-debito", "conta"],
      ["segmento-y-50-cobranca", "contaBeneficiario"],
    ]) {
      const values = records.filter((r) => r.definitionId === def).map((r) => read(r, id));
      expect(values.length, def).toBeGreaterThan(1);
      expect(values.includes("000000056789"), `${def}.${id}`).toBe(false);
      expect(new Set(values).size, `${def}.${id} varia`).toBeGreaterThan(1);
    }
  });

  it("preenchimento parcial: só a agência é aplicada; o resto do perfil é fictício e constante", () => {
    const records = generate(["segmento-a-pagamento"], { companyAccount: { agencia: "77" } });
    const headers = records.filter((r) => ["header-arquivo", "header-lote-pagamento-credito"].includes(r.definitionId!));
    expect(headers.map((r) => read(r, "agencia"))).toEqual(["00077", "00077"]);
    const contas = new Set(headers.map((r) => read(r, "numeroConta")));
    expect(contas.size).toBe(1);
  });
});
