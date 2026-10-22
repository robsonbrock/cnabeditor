import { describe, expect, it } from "vitest";
import { validateField } from "../../src/core/validate/field";
import type { FieldDefinition } from "../../src/core/types";
import { testLayout } from "./fixtures";

const def = (over: Partial<FieldDefinition>): FieldDefinition => {
  const start = over.start ?? 10;
  const size = over.size ?? 2;
  return { id: "campo", name: "Campo", start, end: start + size - 1, size, type: "N", required: false, description: "", ...over };
};
const rules = (d: FieldDefinition, v: string, t: "input" | "blur") => validateField(d, v, t, testLayout).map((e) => e.rule);

describe("validateField", () => {
  describe('trigger "input": só length e type', () => {
    it("N/V/D/H aceitam só dígitos", () => {
      for (const type of ["N", "V", "D", "H"] as const) {
        expect(rules(def({ type, size: 4, ...(type === "V" ? { decimals: 2 } : {}) }), "12a4", "input")).toEqual(["type"]);
      }
      expect(rules(def({ type: "N", size: 4 }), "12 4", "input")).toEqual(["type"]);
      expect(rules(def({ type: "N", size: 4 }), "12", "input")).toEqual([]);
      expect(rules(def({ type: "A", size: 4 }), "ab!", "input")).toEqual([]);
    });

    it("tamanho acima do campo ⇒ length", () => {
      expect(rules(def({ type: "A", size: 3 }), "ABCD", "input")).toEqual(["length"]);
    });

    it("domínio e data não são avaliados durante a digitação", () => {
      expect(rules(def({ size: 1, domain: { ref: "tipoRegistro" } }), "8", "input")).toEqual([]);
      expect(rules(def({ type: "D", size: 8 }), "31022026", "input")).toEqual([]);
    });
  });

  describe('trigger "blur": todas as regras', () => {
    it("domain com a mensagem exata", () => {
      const [e] = validateField(def({ size: 1, domain: { ref: "tipoRegistro" } }), "8", "blur", testLayout);
      expect(e.rule).toBe("domain");
      expect(e.message).toBe('Opção inválida: "8" não é um valor permitido para este campo');
    });

    it("valor válido do domínio, inclusive após o preenchimento com zeros", () => {
      expect(rules(def({ size: 1, domain: { ref: "tipoRegistro" } }), "3", "blur")).toEqual([]);
      expect(rules(def({ size: 2, domain: [{ code: "06", meaning: "Liquidação" }] }), "6", "blur")).toEqual([]);
    });

    it("campo opcional em branco ou zerado não é validado contra o domínio", () => {
      const d = def({ size: 2, domain: [{ code: "01", meaning: "Um" }] });
      expect(rules(d, "00", "blur")).toEqual([]);
      expect(rules(def({ type: "A", size: 2, domain: [{ code: "AB", meaning: "x" }] }), "  ", "blur")).toEqual([]);
      expect(rules({ ...d, required: true }, "00", "blur")).toEqual(["domain"]);
    });

    it("D valida dia/mês/ano reais; 00000000 só quando opcional", () => {
      const d = def({ type: "D", size: 8 });
      const [e] = validateField(d, "31022026", "blur", testLayout);
      expect(e.rule).toBe("date");
      expect(e.message).toBe('Data inválida: "31022026" não é uma data DDMMAAAA válida');
      expect(rules(d, "29022024", "blur")).toEqual([]);
      expect(rules(d, "29022026", "blur")).toEqual(["date"]);
      expect(rules(d, "01132026", "blur")).toEqual(["date"]);
      expect(rules(d, "00000000", "blur")).toEqual([]);
      expect(rules({ ...d, required: true }, "00000000", "blur")).toEqual(["date"]);
    });

    it("H valida 00–23 / 00–59 / 00–59", () => {
      const d = def({ type: "H", size: 6 });
      expect(rules(d, "235959", "blur")).toEqual([]);
      expect(rules(d, "250000", "blur")).toEqual(["time"]);
      expect(rules(d, "126000", "blur")).toEqual(["time"]);
    });

    it("required: alfanumérico em branco ou numérico vazio", () => {
      expect(rules(def({ type: "A", size: 3, required: true }), "   ", "blur")).toEqual(["required"]);
      expect(rules(def({ type: "N", size: 3, required: true }), "", "blur")).toEqual(["required"]);
      expect(rules(def({ type: "N", size: 3, required: true }), "000", "blur")).toEqual([]);
    });

    it("charset: alfanumérico fora do padrão FEBRABAN é sinalizado, sem converter", () => {
      expect(rules(def({ type: "A", size: 10 }), "JOSE DA S.", "blur")).toEqual([]);
      expect(rules(def({ type: "A", size: 10 }), "José", "blur")).toEqual(["charset"]);
      expect(rules(def({ type: "A", size: 10 }), "jose", "blur")).toEqual(["charset"]);
    });

    it("type também é reavaliado no blur", () => {
      expect(rules(def({ size: 2 }), "A1", "blur")).toEqual(["type"]);
    });
  });

  it("cada erro traz line, start, end, fieldId, fieldName, found, rule, trigger", () => {
    const d = def({ id: "tipoMovimento", name: "Tipo de Movimento", start: 15, size: 1, domain: { ref: "tipoRegistro" } });
    expect(validateField(d, "8", "blur", testLayout, 3)[0]).toEqual({
      line: 3,
      start: 15,
      end: 15,
      fieldId: "tipoMovimento",
      fieldName: "Tipo de Movimento",
      found: "8",
      rule: "domain",
      message: 'Opção inválida: "8" não é um valor permitido para este campo',
      trigger: "blur",
    });
    expect(validateField(def({}), "1x", "input", testLayout)[0].message).toBe("Caractere inválido: o campo aceita apenas dígitos (0–9)");
  });
});
