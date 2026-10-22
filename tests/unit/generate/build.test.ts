import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../../src/core/document";
import { generateMassa } from "../../../src/core/generate/build";
import { definitionOf } from "../../../src/core/resolve";
import type { CnabRecord, GenerationConfig, Selection } from "../../../src/core/types";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));
const TODAY = new Date(2026, 9, 22, 10, 30, 0);
const OPTS = { seed: 42, today: TODAY };

const sel = (variantId: string, quantity = 10): Selection => ({ variantId, quantity, auto: false });
const config = (selections: Selection[], extra: Partial<GenerationConfig> = {}): GenerationConfig => ({
  direction: "remessa",
  selections,
  companyAccount: {},
  ...extra,
});

const AJ = config([sel("segmento-a-pagamento"), sel("segmento-j-pagamento")]);
const field = (rec: CnabRecord, id: string) => {
  const f = definitionOf(layout, rec.definitionId)!.fields.find((x) => x.id === id)!;
  return rec.current.slice(f.start - 1, f.end);
};
const byRef = (rec: CnabRecord, ref: string) =>
  definitionOf(layout, rec.definitionId)!.fields.filter((f) => f.reference === ref).map((f) => rec.current.slice(f.start - 1, f.end));

describe("generateMassa (FR-015–FR-022)", () => {
  it("linhas de 240 caracteres, CRLF entre registros e CRLF final", () => {
    const { text, lines } = generateMassa(AJ, layout, OPTS);
    expect(text.endsWith("\r\n")).toBe(true);
    const rows = text.slice(0, -2).split("\r\n");
    expect(rows).toHaveLength(lines);
    expect(lines).toBe(26);
    for (const row of rows) expect(row).toHaveLength(240);
    expect(text).not.toMatch(/[^\x20-\x7e\r\n]/);
  });

  it("mesma configuração, semente e data ⇒ saída idêntica; outra semente ⇒ outra saída", () => {
    expect(generateMassa(AJ, layout, OPTS).text).toBe(generateMassa(AJ, layout, OPTS).text);
    expect(generateMassa(AJ, layout, { ...OPTS, seed: 43 }).text).not.toBe(generateMassa(AJ, layout, OPTS).text);
  });

  it("cada linha resolve para a definição planejada, na estrutura HA, HL, detalhes, TL, …, TA", () => {
    const doc = fromPastedText(generateMassa(AJ, layout, OPTS).text, layout);
    expect(doc.records.map((r) => r.definitionId)).toEqual([
      "header-arquivo",
      "header-lote-pagamento-credito",
      ...Array(10).fill("segmento-a-pagamento"),
      "trailer-lote-pagamento",
      "header-lote-pagamento-titulos",
      ...Array(10).fill("segmento-j-pagamento"),
      "trailer-lote-pagamento",
      "trailer-arquivo",
    ]);
    expect(doc.direction).toBe("remessa");
  });

  it("lote e sequencial coerentes (G002, G038)", () => {
    const doc = fromPastedText(generateMassa(AJ, layout, OPTS).text, layout);
    expect(byRef(doc.records[0], "G002")).toEqual(["0000"]);
    expect(byRef(doc.records[1], "G002")).toEqual(["0001"]);
    expect(byRef(doc.records[2], "G038")).toEqual(["00001"]);
    expect(byRef(doc.records[11], "G038")).toEqual(["00010"]);
    expect(byRef(doc.records[13], "G002")).toEqual(["0002"]);
    expect(byRef(doc.records[25], "G002")).toEqual(["9999"]);
  });

  it("empresa e banco iguais em todo o arquivo (FR-021, FR-027)", () => {
    const doc = fromPastedText(generateMassa(AJ, layout, OPTS).text, layout);
    expect(new Set(doc.records.map((r) => field(r, "codigoBanco"))).size).toBe(1);
    const headers = doc.records.filter((r) => ["fileHeader", "batchHeader"].includes(definitionOf(layout, r.definitionId)!.kind));
    for (const ref of ["G006", "G008", "G010", "G013"]) {
      const values = new Set(headers.flatMap((r) => byRef(r, ref)).map((v) => v.replace(/^0+/, "").trimEnd()));
      expect(values.size, ref).toBe(1);
    }
  });

  it("detalhes consecutivos têm nome, documento e valor diferentes (FR-019, SC-006)", () => {
    const doc = fromPastedText(generateMassa(config([sel("segmento-a-pagamento", 200)]), layout, OPTS).text, layout);
    const details = doc.records.filter((r) => r.definitionId === "segmento-a-pagamento");
    const key = (r: CnabRecord) => [field(r, "nomeFavorecido"), field(r, "seuNumero"), field(r, "valorPagamento")].join("|");
    for (let i = 1; i < details.length; i++) expect(key(details[i]), `detalhe ${i}`).not.toBe(key(details[i - 1]));
  });
});
