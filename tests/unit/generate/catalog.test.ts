import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "../../../src/core/generate/catalog";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));

describe("buildCatalog (FR-003, FR-004)", () => {
  it("um grupo por Header de Lote, rotulado pelo título oficial sem \"Header de Lote – \"", () => {
    const groups = buildCatalog(layout, "remessa");
    expect(groups[0]).toMatchObject({
      header: "header-lote-pagamento-credito",
      label: "Pagamentos (Crédito em Conta, Cheque, OP, DOC, TED, PIX ou Pagamento com Autenticação)",
    });
    expect(groups.find((g) => g.header === "header-lote-pagamento-titulos")?.label).toBe("Pagamentos (Títulos de Cobrança e QR Code Pix)");
  });

  it("variações rotuladas pelo título do detalhe sem \"Detalhe – \", na ordem do generation.json", () => {
    const titulos = buildCatalog(layout, "remessa").find((g) => g.header === "header-lote-pagamento-titulos")!;
    expect(titulos.variants.map((v) => v.label)).toEqual(["Segmento J", "Segmento J-52", "Segmento J-52 Pix", "Segmento J-53"]);
  });

  it("filtra pela direção e remove grupos vazios", () => {
    const remessa = buildCatalog(layout, "remessa").flatMap((g) => g.variants.map((v) => v.id));
    const retorno = buildCatalog(layout, "retorno").flatMap((g) => g.variants.map((v) => v.id));
    expect(remessa).toContain("segmento-p-cobranca");
    expect(remessa).not.toContain("segmento-t-cobranca");
    expect(retorno).toContain("segmento-t-cobranca");
    expect(retorno).not.toContain("segmento-p-cobranca");
    expect(buildCatalog(layout, "remessa").some((g) => g.header === "header-lote-conciliacao")).toBe(false);
  });

  it("calcula dependents como o inverso de requires", () => {
    const cob = buildCatalog(layout, "remessa").find((g) => g.header === "header-lote-cobranca")!;
    const p = cob.variants.find((v) => v.id === "segmento-p-cobranca")!;
    expect(p.dependents).toContain("segmento-q-cobranca");
    expect(cob.variants.find((v) => v.id === "segmento-q-cobranca")!.requires).toBe("segmento-p-cobranca");
  });

  it("layout sem generation devolve []", () => {
    const bare = { ...layout, generation: undefined };
    expect(buildCatalog(bare, "remessa")).toEqual([]);
  });
});
