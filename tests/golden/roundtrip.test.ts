// Gate de merge (constituição): round-trip byte a byte de TODOS os golden files.
import { describe, expect, it } from "vitest";
import { decodeFile, fromPastedText } from "../../src/core/document";
import { encodeForExport, toClipboardText } from "../../src/core/export";
import { febrabanCnab240 as layout } from "../../src/layouts/loader";
import { goldenFiles } from "./harness";

describe("golden files: round-trip byte a byte", () => {
  for (const g of goldenFiles()) {
    it(`${g.kind}/${g.name}: importar e exportar sem edição ⇒ bytes idênticos`, () => {
      const out = encodeForExport(decodeFile(g.bytes, g.name, layout)).bytes;
      expect(out.length).toBe(g.bytes.length);
      expect(Buffer.from(out).equals(Buffer.from(g.bytes))).toBe(true);
    });
  }

  it("colar → copiar/exportar preserva espaços finais e linhas só de espaços (SC-005b)", () => {
    const g = goldenFiles().find((f) => f.name === "cobranca-retorno.ret")!;
    const text = Buffer.from(g.bytes).toString("latin1") + "     \n" + " ".repeat(240) + "\n";
    const doc = fromPastedText(text, layout);
    expect(toClipboardText(doc)).toBe(text);
    const exported = Buffer.from(encodeForExport(doc).bytes).toString("latin1");
    expect(exported).toBe(text.replace(/\n/g, "\r\n"));
  });
});
