import { describe, expect, it } from "vitest";
import { decodeFile, detectDirection, fromPastedText, isAcceptedExtension } from "../../src/core/document";
import { L, line, testLayout } from "./fixtures";

const latin1 = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe("decodeFile", () => {
  it("lê bytes ISO-8859-1, guarda origem, nome, encoding e terminadores", () => {
    const text = `${L.ha()}\r\n${L.hl()}\r\n${L.a()}\n${L.tl()}\r\n${L.ta()}`;
    const doc = decodeFile(latin1(text), "pagamento.rem", testLayout);
    expect(doc.origin).toBe("file");
    expect(doc.fileName).toBe("pagamento.rem");
    expect(doc.encoding).toBe("iso-8859-1");
    expect(doc.bom).toBe(false);
    expect(doc.records.map((r) => r.terminator)).toEqual(["CRLF", "CRLF", "LF", "CRLF", ""]);
    expect(doc.records.map((r) => r.label)).toEqual(["HA", "HL", "A", "TL", "TA"]);
    expect(doc.records.every((r) => r.original === r.current)).toBe(true);
    expect(doc.direction).toBe("remessa");
  });

  it("preserva bytes 0x80–0xFF como caracteres Latin-1", () => {
    const doc = decodeFile(new Uint8Array([0x41, 0xc7, 0xe3, 0x80]), "x.txt", testLayout);
    expect(doc.records[0].current).toBe("AÇã\u0080");
  });

  it("detecta UTF-8 com BOM e remove o BOM do texto", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("AÇÃO\n")]);
    const doc = decodeFile(bytes, "x.rem", testLayout);
    expect(doc.encoding).toBe("utf-8");
    expect(doc.bom).toBe(true);
    expect(doc.records[0].current).toBe("AÇÃO");
  });

  it("flags zeradas e sem alterações não exportadas após a carga", () => {
    const doc = decodeFile(latin1(`${L.ha()}\n${L.ta()}\n`), "x.rem", testLayout);
    expect(Array.from(doc.flags)).toEqual([0, 0]);
    expect(doc.hasUnexportedChanges).toBe(false);
  });

  it("arquivo vazio ⇒ 0 registros", () => {
    expect(decodeFile(new Uint8Array(), "vazio.rem", testLayout).records).toEqual([]);
  });
});

describe("fromPastedText", () => {
  it("não altera nenhum caractere: espaços iniciais/finais, linhas só de espaços e quebra final", () => {
    const t = `  ${L.ha()}  \n      \n${L.ta()}   \n`;
    const doc = fromPastedText(t, testLayout);
    expect(doc.origin).toBe("paste");
    expect(doc.encoding).toBe("iso-8859-1");
    expect(doc.fileName).toBeUndefined();
    const sep = (term: string) => (term ? "\n" : "");
    expect(doc.records.map((r) => r.current + sep(r.terminator)).join("")).toBe(t);
    expect(doc.records[1].current).toBe("      ");
  });

  it("sem quebra final ⇒ último terminador vazio", () => {
    const doc = fromPastedText("abc\ndef", testLayout);
    expect(doc.records.at(-1)!.terminator).toBe("");
  });
});

describe("isAcceptedExtension", () => {
  it.each(["a.rem", "a.ret", "a.txt", "A.REM", "b.Ret", "x.y.TXT"])("aceita %s", (n) => expect(isAcceptedExtension(n)).toBe(true));
  it.each(["a.csv", "a", "a.rem.bak", "rem", "a.txt "])("recusa %s", (n) => expect(isAcceptedExtension(n)).toBe(false));
});

describe("detectDirection", () => {
  const dir = (lines: string[]) => detectDirection(fromPastedText(lines.join("\n"), testLayout));

  it("pos. 143 do HA: 1 remessa, 2 retorno, outro unknown", () => {
    expect(dir([L.ha("1"), L.ta()])).toBe("remessa");
    expect(dir([L.ha("2"), L.ta()])).toBe("retorno");
    expect(dir([L.ha("7"), L.ta()])).toBe("unknown");
    expect(dir([L.ha(" "), L.ta()])).toBe("unknown");
  });

  it("usa o primeiro registro HA quando a primeira linha não é HA", () => {
    expect(dir([line({ 8: "7" }), L.ha("2"), L.ta()])).toBe("retorno");
  });

  it("sem HA ⇒ unknown", () => {
    expect(dir([L.hl(), L.tl()])).toBe("unknown");
    expect(dir([])).toBe("unknown");
  });

  it("HA curto sem a pos. 143 ⇒ unknown", () => {
    expect(dir([L.ha("1").slice(0, 100)])).toBe("unknown");
  });
});
