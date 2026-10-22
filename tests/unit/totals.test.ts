import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { recalculateTotals, validateTotals } from "../../src/core/validate/totals";
import { L, line, testLayout } from "./fixtures";

const docOf = (lines: string[]) => fromPastedText(lines.join("\n"), testLayout);

describe("validateTotals", () => {
  it("trailers consistentes ⇒ sem erros (TL conta HL e TL; TA conta HA e TA)", () => {
    expect(validateTotals(docOf([L.ha(), L.hl(), L.a("00001", "000000000010000"), L.a("00002", "000000000005050"), L.tl("000004", "000000000000015050"), L.ta("000001", "000006")]), testLayout)).toEqual([]);
  });

  it("totalMismatch com found, expected e mensagem", () => {
    const errors = validateTotals(docOf([L.ha(), L.hl(), L.a(), L.tl("000009", "000000000000099999"), L.ta("000002", "000005")]), testLayout);
    expect(errors.map((e) => [e.line, e.fieldId, e.found, e.expected])).toEqual([
      [4, "qtdRegistros", "000009", "000003"],
      [4, "somatoria", "000000000000099999", "000000000000010000"],
      [5, "qtdLotes", "000002", "000001"],
    ]);
    expect(errors[0]).toMatchObject({ rule: "totalMismatch", start: 18, end: 23, message: "Total divergente: encontrado 000009, esperado 000003", trigger: "file" });
  });

  it("soma com BigInt acima de 2^53 sem perda", () => {
    const big = "999999999999999"; // 15 dígitos por linha; soma > 2^53
    const lines = [L.ha(), L.hl(), ...Array.from({ length: 20 }, (_, i) => L.a(String(i + 1).padStart(5, "0"), big)), L.tl("000022", "000000000000000000"), L.ta("000001", "000024")];
    const [e] = validateTotals(docOf(lines), testLayout);
    expect(e.expected).toBe((BigInt(big) * 20n).toString().padStart(18, "0"));
  });

  it("estouro do tamanho do campo ⇒ totalOverflow", () => {
    const lines = [L.ha(), L.hl(), L.a("00001", "000000001234567"), L.tl("000003", "000000000001234567"), L.ta("000001", "000005")];
    const layoutSmall = structuredClone(testLayout);
    const tl = layoutSmall.records.find((r) => r.id === "tl")!;
    tl.totals = [{ field: "qtdRegistros", kind: "sum", source: { records: ["seg-a"], field: "valor" } }];
    const errors = validateTotals(fromPastedText(lines.join("\n"), layoutSmall), layoutSmall);
    expect(errors).toEqual([expect.objectContaining({ rule: "totalOverflow", line: 4, fieldId: "qtdRegistros", expected: "1234567" })]);
  });
});

describe("recalculateTotals", () => {
  it("altera só os campos totalizadores e lista de → para", () => {
    const lines = [L.ha(), L.hl(), L.a(), L.tl("000009", "000000000000000001"), L.ta("000007", "000005")];
    const doc = docOf(lines);
    const { records, changes, errors } = recalculateTotals(doc, testLayout);
    expect(errors).toEqual([]);
    expect(changes).toEqual([
      { line: 4, recordTitle: "Trailer de Lote", fieldName: "Quantidade de Registros do Lote", from: "000009", to: "000003" },
      { line: 4, recordTitle: "Trailer de Lote", fieldName: "Somatória dos Valores", from: "000000000000000001", to: "000000000000010000" },
      { line: 5, recordTitle: "Trailer de Arquivo", fieldName: "Quantidade de Lotes do Arquivo", from: "000007", to: "000001" },
    ]);
    expect([...records.keys()]).toEqual([3, 4]);
    expect(records.get(3)).toBe(L.tl("000003", "000000000000010000"));
    expect(records.get(4)).toBe(L.ta("000001", "000005"));
    // nenhum registro criado ou removido; documento de entrada intacto
    expect(doc.records.map((r) => r.current)).toEqual(lines);
  });

  it("trailers consistentes ⇒ changes vazio e nenhum registro alterado", () => {
    const { records, changes } = recalculateTotals(docOf([L.ha(), L.hl(), L.a(), L.tl("000003", "000000000000010000"), L.ta("000001", "000005")]), testLayout);
    expect(changes).toEqual([]);
    expect(records.size).toBe(0);
  });

  it("lote sem TL ⇒ só trailers existentes; fora do lote usa o Lote de Serviço como critério auxiliar", () => {
    const lines = [L.ha(), L.hl(), L.a(), L.hl("20", "0002"), L.a("00001", "000000000000500", "0002"), L.tl("000000", "000000000000000000", "0002"), L.ta("000002", "000007")];
    const { changes } = recalculateTotals(docOf(lines), testLayout);
    expect(changes.map((c) => [c.line, c.to])).toEqual([
      [6, "000003"],
      [6, "000000000000000500"],
    ]);
  });

  it("TL sem HL aberto agrupa os registros anteriores do mesmo lote", () => {
    const x = (lote: string) => line({ 1: "341", 4: lote, 8: "3", 14: "X" });
    const lines = [L.ha(), x("0001"), x("0002"), x("0001"), L.tl("000000", "000000000000000000"), L.ta("000000", "000006")];
    const { changes } = recalculateTotals(docOf(lines), testLayout);
    expect(changes.map((c) => [c.fieldName, c.to])).toEqual([["Quantidade de Registros do Lote", "000003"]]);
  });

  it("estouro não grava o campo e devolve erro", () => {
    const layoutSmall = structuredClone(testLayout);
    layoutSmall.records.find((r) => r.id === "tl")!.totals = [{ field: "qtdRegistros", kind: "sum", source: { records: ["seg-a"], field: "valor" } }];
    const lines = [L.ha(), L.hl(), L.a("00001", "000000001234567"), L.tl("000003"), L.ta("000001", "000005")];
    const { records, errors } = recalculateTotals(fromPastedText(lines.join("\n"), layoutSmall), layoutSmall);
    expect(records.size).toBe(0);
    expect(errors.map((e) => e.rule)).toEqual(["totalOverflow"]);
  });

  it("linha não reconhecida dentro do lote conta como registro do lote", () => {
    const lines = [L.ha(), L.hl(), L.a(), line({ 8: "7" }), L.tl("000004", "000000000000010000"), L.ta("000001", "000006")];
    expect(recalculateTotals(docOf(lines), testLayout).changes).toEqual([]);
  });
});
