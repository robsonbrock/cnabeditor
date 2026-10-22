import { describe, expect, it } from "vitest";
import { describeDomain } from "../../src/core/fields";
import type { FieldDefinition } from "../../src/core/types";
import { testLayout } from "./fixtures";

const base: FieldDefinition = { id: "x", name: "X", start: 1, end: 1, size: 1, type: "N", required: false, description: "" };

describe("describeDomain", () => {
  it("null para campo sem domain", () => {
    expect(describeDomain(base, "3", testLayout)).toBeNull();
  });

  it("resolve {ref} em layout.domains e destaca a opção atual", () => {
    const r = describeDomain({ ...base, domain: { ref: "tipoRegistro" } }, "3", testLayout)!;
    expect(r.options.map((o) => o.code)).toEqual(["0", "1", "3", "5", "9"]);
    expect(r.match).toEqual({ code: "3", meaning: "Detalhe" });
  });

  it("lista inline", () => {
    const r = describeDomain({ ...base, domain: [{ code: "A", meaning: "Alfa" }, { code: "B", meaning: "Beta" }] }, "B", testLayout)!;
    expect(r.options).toHaveLength(2);
    expect(r.match?.meaning).toBe("Beta");
  });

  it("valor fora das opções ⇒ match null", () => {
    expect(describeDomain({ ...base, domain: { ref: "tipoRegistro" } }, "7", testLayout)!.match).toBeNull();
    expect(describeDomain({ ...base, domain: { ref: "tipoRegistro" } }, "", testLayout)!.match).toBeNull();
  });

  it("referência inexistente ⇒ lista vazia, sem exceção", () => {
    expect(describeDomain({ ...base, domain: { ref: "naoExiste" } }, "1", testLayout)).toEqual({ options: [], match: null });
  });
});
