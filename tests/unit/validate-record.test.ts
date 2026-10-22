import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { validateRecord } from "../../src/core/validate/record";
import { L, line, testLayout } from "./fixtures";

const rec = (lines: string[], i: number) => fromPastedText(lines.join("\n"), testLayout).records[i];

describe("validateRecord", () => {
  it("linha válida ⇒ sem erros", () => {
    expect(validateRecord(rec([L.ha(), L.hl(), L.a()], 2), testLayout)).toEqual([]);
  });

  it("lineLength quando ≠ 240, com o tamanho encontrado", () => {
    const errors = validateRecord(rec([L.ha().slice(0, 238)], 0), testLayout);
    expect(errors).toEqual([
      expect.objectContaining({ line: 1, start: 1, end: 238, rule: "lineLength", found: "238", expected: "240", trigger: "file", message: "Tamanho de linha inválido: 238 caracteres, esperado 240" }),
    ]);
  });

  it("campos incompletos de linha curta não são validados", () => {
    const short = L.a().slice(0, 64);
    expect(validateRecord(rec([L.hl(), short], 1), testLayout).map((e) => e.rule)).toEqual(["lineLength"]);
  });

  it("unknownRecord é informado e não valida campos", () => {
    const errors = validateRecord(rec([line({ 8: "7", 20: "abc" })], 0), testLayout);
    expect(errors.map((e) => e.rule)).toEqual(["unknownRecord"]);
    expect(errors[0]).toMatchObject({ start: 1, end: 240, message: "Registro não reconhecido pelo layout" });
  });

  it("batchMismatch marca o campo segmento e os campos do segmento continuam validados", () => {
    const errors = validateRecord(rec([L.ha(), L.hl("01"), L.a("00001", "00000000001000A")], 2), testLayout);
    expect(errors.map((e) => [e.fieldId, e.rule])).toEqual([
      ["segmento", "batchMismatch"],
      ["valor", "type"],
    ]);
    expect(errors[0]).toMatchObject({ start: 14, end: 14, message: "Segmento A não corresponde ao lote (Header de Lote na linha 2, serviço 01)" });
  });

  it("valida todos os campos da linha (regras de blur) com trigger file", () => {
    const bad = L.a("0000X", "00000000001000A");
    const errors = validateRecord(rec([L.hl(), bad], 1), testLayout);
    expect(errors.map((e) => [e.fieldId, e.rule])).toEqual([
      ["sequencial", "type"],
      ["valor", "type"],
    ]);
    expect(errors.every((e) => e.trigger === "file" && e.line === 2)).toBe(true);
  });
});
