import { describe, expect, it } from "vitest";
import { maskError, maskValue } from "../../src/core/mask";
import type { FieldDefinition, ValidationError } from "../../src/core/types";

const def = (sensitive?: boolean): FieldDefinition => ({ id: "doc", name: "CPF", start: 1, end: 14, size: 14, type: "N", required: false, description: "", ...(sensitive ? { sensitive } : {}) });

describe("maskValue (Princípio V)", () => {
  it("campo sensível mostra só os 2 últimos caracteres", () => {
    expect(maskValue(def(true), "00012345678909")).toBe("************09");
    expect(maskValue(def(true), "12")).toBe("**");
    expect(maskValue(def(true), "")).toBe("");
  });

  it("campo não sensível fica como está", () => {
    expect(maskValue(def(), "00012345678909")).toBe("00012345678909");
  });

  it("maskError mascara found/expected e a mensagem", () => {
    const e: ValidationError = { line: 1, start: 1, end: 14, fieldId: "doc", fieldName: "CPF", found: "1234567890123X", rule: "type", message: 'Valor "1234567890123X" inválido', trigger: "blur" };
    const masked = maskError(e, def(true));
    expect(masked.found).toBe("************3X");
    expect(masked.message).not.toContain("1234567890123X");
  });
});
