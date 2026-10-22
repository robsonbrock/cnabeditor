import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { validateStructure } from "../../src/core/validate/structure";
import { L, line, testLayout } from "./fixtures";

const run = (lines: string[]) => validateStructure(fromPastedText(lines.join("\n"), testLayout), testLayout);
const summary = (lines: string[]) => run(lines).map((e) => `${e.line}:${e.rule}`);

describe("validateStructure", () => {
  it("arquivo bem formado ⇒ sem erros", () => {
    expect(run([L.ha(), L.hl(), L.a("00001"), L.a("00002"), L.tl(), L.ta()])).toEqual([]);
  });

  it("dois lotes numerados 0001 e 0002", () => {
    expect(run([L.ha(), L.hl("20", "0001"), L.a(), L.tl(), L.hl("20", "0002"), L.a("00001", undefined, "0002"), L.tl(undefined, undefined, "0002"), L.ta()])).toEqual([]);
  });

  it("sequence: sem Header de Arquivo", () => {
    const errors = run([L.hl(), L.a(), L.tl(), L.ta()]);
    expect(errors).toEqual([expect.objectContaining({ line: 1, start: 1, end: 240, rule: "sequence", message: "Sequência inválida: arquivo sem Header de Arquivo" })]);
  });

  it("sequence: detalhe fora de lote (definição sem condição de lote)", () => {
    expect(summary([L.ha(), line({ 1: "341", 4: "0001", 8: "3", 14: "X" }), L.ta()])).toContain("2:sequence");
  });

  it("sequence: Header de Lote sem Trailer de Lote antes do próximo HL e do TA", () => {
    expect(summary([L.ha(), L.hl(), L.a(), L.hl("20", "0002"), L.a("00001", undefined, "0002"), L.ta()])).toEqual(["4:sequence", "6:sequence"]);
  });

  it("sequence: sem Trailer de Arquivo e registro após o TA", () => {
    expect(summary([L.ha(), L.hl(), L.a(), L.tl()])).toEqual(["4:sequence"]);
    expect(summary([L.ha(), L.ta(), L.ha()])).toContain("3:sequence");
  });

  it("registros não reconhecidos são ignorados pela sequência", () => {
    expect(run([L.ha(), line({ 8: "7" }), L.hl(), L.a(), L.tl(), L.ta()])).toEqual([]);
  });

  it("batchNumber: lote do HL fora de ordem e detalhe com lote diferente do HL", () => {
    const errors = run([L.ha(), L.hl("20", "0002"), L.a("00001", undefined, "0002"), L.a("00002", undefined, "0003"), L.tl(undefined, undefined, "0002"), L.ta()]);
    expect(errors.map((e) => [e.line, e.rule, e.found, e.expected])).toEqual([
      [2, "batchNumber", "0002", "0001"],
      [4, "batchNumber", "0003", "0002"],
    ]);
    expect(errors[0]).toMatchObject({ start: 4, end: 7, fieldId: "lote", message: "Número do lote divergente: encontrado 0002, esperado 0001" });
  });

  it("batchNumber: HA deve ter 0000 e TA 9999", () => {
    const ha = L.ha().slice(0, 3) + "0001" + L.ha().slice(7);
    expect(run([ha, L.ta()]).map((e) => [e.line, e.rule, e.expected])).toEqual([[1, "batchNumber", "0000"]]);
  });

  it("recordSequence: sequencial no lote é só validado", () => {
    const errors = run([L.ha(), L.hl(), L.a("00001"), L.a("00003"), L.tl(), L.ta()]);
    expect(errors).toEqual([
      expect.objectContaining({ line: 4, rule: "recordSequence", fieldId: "sequencial", found: "00003", expected: "00002", message: "Sequencial do registro divergente: encontrado 00003, esperado 00002" }),
    ]);
  });
});
