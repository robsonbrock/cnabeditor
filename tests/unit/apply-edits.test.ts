import { describe, expect, it } from "vitest";
import { applyEdits, sliceFields } from "../../src/core/fields";
import { fromPastedText } from "../../src/core/document";
import { L, testLayout } from "./fixtures";

function session(text: string) {
  const rec = fromPastedText([L.hl(), text].join("\n"), testLayout).records[1];
  const views = sliceFields(rec, testLayout);
  const baseline = Object.fromEntries(views.map((v) => [v.def.id, v.value]));
  return { rec, defs: views.map((v) => v.def), baseline, values: { ...baseline } };
}

const diff = (a: string, b: string) => [...a].flatMap((c, i) => (c === b[i] ? [] : [i + 1]));

describe("applyEdits", () => {
  it("sem edições ⇒ linha idêntica, mesmo com campos fora do padrão", () => {
    const odd = L.a().slice(0, 44) + "   12345     " + L.a().slice(57); // numérico com espaços
    const s = session(odd);
    expect(applyEdits(odd, s.defs, s.values, s.baseline)).toBe(odd);
  });

  it("N/V com zeros à esquerda, A com espaços à direita; só as posições do campo mudam", () => {
    const s = session(L.a());
    const out = applyEdits(L.a(), s.defs, { ...s.values, valor: "123", nome: "BELTRANO" }, s.baseline);
    expect(out.slice(58, 73)).toBe("000000000000123");
    expect(out.slice(14, 44)).toBe("BELTRANO".padEnd(30, " "));
    expect(out).toHaveLength(240);
    expect(diff(L.a(), out).every((p) => (p >= 15 && p <= 44) || (p >= 59 && p <= 73))).toBe(true);
  });

  it("campo não editado é reaproveitado mesmo se outro campo muda", () => {
    const odd = L.a().slice(0, 44) + "   12345     " + L.a().slice(57);
    const s = session(odd);
    const out = applyEdits(odd, s.defs, { ...s.values, nome: "X" }, s.baseline);
    expect(out.slice(44, 57)).toBe("   12345     ");
  });

  it("valor já com o tamanho exato passa intacto", () => {
    const s = session(L.a());
    expect(applyEdits(L.a(), s.defs, { ...s.values, numeroInscricao: "12345678901234" }, s.baseline).slice(44, 58)).toBe("12345678901234");
  });

  it("nunca trunca: valor maior que o campo ⇒ erro", () => {
    const s = session(L.a());
    expect(() => applyEdits(L.a(), s.defs, { ...s.values, sequencial: "123456" }, s.baseline)).toThrow();
  });

  it("editar de volta ao original ⇒ linha igual ao original", () => {
    const s = session(L.a());
    const changed = applyEdits(L.a(), s.defs, { ...s.values, nome: "OUTRO" }, s.baseline);
    const s2 = session(changed);
    expect(applyEdits(changed, s2.defs, { ...s2.values, nome: s.baseline.nome }, s2.baseline)).toBe(L.a());
  });

  it("linha curta: campo editado parcial é completado com o preenchimento", () => {
    const short = L.a().slice(0, 50);
    const s = session(short);
    const out = applyEdits(short, s.defs, { ...s.values, numeroInscricao: "1" }, s.baseline);
    expect(out).toBe(short.slice(0, 44) + "00000000000001");
  });
});
