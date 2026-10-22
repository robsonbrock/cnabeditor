import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { filledCount, sliceFields } from "../../src/core/fields";
import type { FieldDefinition } from "../../src/core/types";
import { L, testLayout } from "./fixtures";

const recordOf = (text: string, i = 0) => fromPastedText(text, testLayout).records[i];
const def = (type: FieldDefinition["type"], size: number): FieldDefinition => ({
  id: "x",
  name: "X",
  start: 1,
  end: size,
  size,
  type,
  required: false,
  description: "",
  ...(type === "V" ? { decimals: 2 } : {}),
});

describe("sliceFields", () => {
  it("fatia current por start/end na ordem das posições", () => {
    const rec = recordOf([L.ha(), L.hl(), L.a()].join("\n"), 2);
    const views = sliceFields(rec, testLayout);
    expect(views.map((v) => v.def.id).slice(0, 4)).toEqual(["banco", "lote", "tipoRegistro", "sequencial"]);
    expect(views.find((v) => v.def.id === "numeroInscricao")!.value).toBe("00000377654540");
    expect(views.map((v) => v.value).join("")).toBe(rec.current);
  });

  it("linha curta ⇒ campos até onde houver caracteres", () => {
    const rec = recordOf(L.ha().slice(0, 20));
    const views = sliceFields(rec, testLayout);
    expect(views.at(-1)!.def.id).toBe("filler");
    expect(views.at(-1)!.value).toHaveLength(12);
    expect(views.map((v) => v.value).join("")).toBe(rec.current);
  });

  it("registro não reconhecido ⇒ um campo sintético 'Conteúdo bruto' 1..len", () => {
    const rec = recordOf("ABC   XYZ7");
    const views = sliceFields(rec, testLayout);
    expect(views).toHaveLength(1);
    expect(views[0].def).toMatchObject({ name: "Conteúdo bruto", start: 1, end: 10, size: 10, type: "A" });
    expect(views[0].value).toBe("ABC   XYZ7");
  });
});

describe("filledCount", () => {
  it("N/V/D/H: comprimento após remover zeros à esquerda", () => {
    expect(filledCount(def("N", 14), "00000377654540")).toBe(9);
    expect(filledCount(def("N", 5), "00000")).toBe(0);
    expect(filledCount(def("V", 15), "000000000010000")).toBe(5);
    expect(filledCount(def("D", 8), "01012026")).toBe(7);
    expect(filledCount(def("H", 6), "000000")).toBe(0);
  });

  it("A: comprimento após remover espaços à direita", () => {
    expect(filledCount(def("A", 30), "FULANO DE TAL" + " ".repeat(17))).toBe(13);
    expect(filledCount(def("A", 5), "  X  ")).toBe(3);
    expect(filledCount(def("A", 5), "     ")).toBe(0);
  });
});
