import { describe, expect, it } from "vitest";
import { decodeLatin1, decodeUtf8, detectEncoding, encodeLatin1, encodeUtf8, stripBom } from "../../src/core/encoding";

const bytes = (...b: number[]) => new Uint8Array(b);

describe("encoding", () => {
  it("encodeLatin1(decodeLatin1(b)) === b para os 256 valores de byte", () => {
    const all = new Uint8Array(256).map((_, i) => i);
    const text = decodeLatin1(all);
    expect(text.length).toBe(256);
    expect(encodeLatin1(text).bytes).toEqual(all);
    expect(encodeLatin1(text).unmappable).toEqual([]);
  });

  it("0x80–0x9F não viram windows-1252", () => {
    expect(decodeLatin1(bytes(0x80, 0x9f)).split("").map((c) => c.charCodeAt(0))).toEqual([0x80, 0x9f]);
  });

  it("detecta utf-8 só quando decodifica e há byte >= 0x80", () => {
    expect(detectEncoding(new TextEncoder().encode("AÇÃO"))).toBe("utf-8");
    expect(detectEncoding(new TextEncoder().encode("ACAO"))).toBe("iso-8859-1");
    expect(detectEncoding(bytes(0x41, 0xc7, 0x41))).toBe("iso-8859-1");
    expect(detectEncoding(bytes())).toBe("iso-8859-1");
  });

  it("detecta e remove o BOM UTF-8", () => {
    const withBom = bytes(0xef, 0xbb, 0xbf, 0x41, 0xc3, 0x87);
    expect(detectEncoding(withBom)).toBe("utf-8");
    const { bom, body } = stripBom(withBom);
    expect(bom).toBe(true);
    expect(decodeUtf8(body)).toBe("AÇ");
    expect(stripBom(bytes(0x41)).bom).toBe(false);
  });

  it("utf-8 faz ida e volta", () => {
    const text = "Ação ç ñ €";
    expect(decodeUtf8(encodeUtf8(text))).toBe(text);
  });

  it("encoder ISO-8859-1 grava '?' por code point > 0xFF; emoji vira um único '?'", () => {
    const { bytes: out, unmappable } = encodeLatin1("A😀B€");
    expect(Array.from(out)).toEqual([0x41, 0x3f, 0x42, 0x3f]);
    expect(unmappable).toEqual([
      { index: 1, char: "😀" },
      { index: 3, char: "€" },
    ]);
  });
});
