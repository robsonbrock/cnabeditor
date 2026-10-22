import { describe, expect, it } from "vitest";
import { decodeFile, fromPastedText } from "../../src/core/document";
import { encodeForExport, exportFileName, toClipboardText } from "../../src/core/export";
import { testLayout } from "./fixtures";

const latin1 = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));
const ascii = (b: Uint8Array) => String.fromCharCode(...b);

describe("encodeForExport", () => {
  it('origin "file": terminador original por registro, encoding e ausência de quebra final', () => {
    const src = latin1("AÇ\r\nB\nC\rD");
    const plan = encodeForExport(decodeFile(src, "x.rem", testLayout));
    expect(plan.bytes).toEqual(src);
    expect(plan.unmappable).toEqual([]);
  });

  it('origin "file" UTF-8 com BOM ⇒ BOM e UTF-8 preservados', () => {
    const src = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("AÇÃO\r\n")]);
    expect(encodeForExport(decodeFile(src, "x.rem", testLayout)).bytes).toEqual(src);
  });

  it('origin "file" com edição: só a linha editada muda', () => {
    const doc = decodeFile(latin1("AAA\r\nBBB\n"), "x.rem", testLayout);
    doc.records[0].current = "AXA";
    expect(ascii(encodeForExport(doc).bytes)).toBe("AXA\r\nBBB\n");
  });

  it('origin "paste": terminadores não vazios ⇒ CRLF; quebra final preservada', () => {
    expect(ascii(encodeForExport(fromPastedText("  A  \n   \nB\n", testLayout)).bytes)).toBe("  A  \r\n   \r\nB\r\n");
    expect(ascii(encodeForExport(fromPastedText("A\nB", testLayout)).bytes)).toBe("A\r\nB");
  });

  it('origin "paste": ISO-8859-1 com "?" para code point > U+00FF; emoji conta uma posição', () => {
    const doc = fromPastedText("AÇ😀B\nX€", testLayout);
    const plan = encodeForExport(doc);
    expect(Array.from(plan.bytes)).toEqual([0x41, 0xc7, 0x3f, 0x42, 0x0d, 0x0a, 0x58, 0x3f]);
    expect(plan.unmappable).toEqual([
      { line: 1, position: 3, char: "😀" },
      { line: 2, position: 2, char: "€" },
    ]);
    expect(doc.records[0].current).toBe("AÇ😀B");
  });
});

describe("toClipboardText", () => {
  it("conteúdo atual + terminadores originais, sem rótulos", () => {
    const doc = decodeFile(latin1("A  \r\n   \nB"), "x.rem", testLayout);
    expect(toClipboardText(doc)).toBe("A  \r\n   \nB");
    const pasted = fromPastedText(" A \n\n", testLayout);
    expect(toClipboardText(pasted)).toBe(" A \n\n");
  });
});

describe("exportFileName", () => {
  it("cnabeditor_AAAAMMDDHHMMSS.<ext> pelo relógio local, com zeros à esquerda", () => {
    expect(exportFileName(new Date(2026, 9, 22, 11, 52, 7), "rem")).toBe("cnabeditor_20261022115207.rem");
    expect(exportFileName(new Date(2026, 0, 2, 3, 4, 5), "ret")).toBe("cnabeditor_20260102030405.ret");
  });
});
