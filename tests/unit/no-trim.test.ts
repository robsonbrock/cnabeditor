import { ESLint } from "eslint";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { encodeForExport, toClipboardText } from "../../src/core/export";
import { febrabanCnab240 as layout } from "../../src/layouts/loader";

describe("guarda contra trim (FR-006b, FR-027a)", () => {
  const text = ["   espaços iniciais", "espaços finais    ", "  vários   espaços   no   meio  ", "      ", "", " \t "].join("\n") + "\n";

  it("colar → copiar devolve o texto caractere a caractere", () => {
    expect(toClipboardText(fromPastedText(text, layout))).toBe(text);
  });

  it("colar → exportar só troca a quebra de linha por CRLF", () => {
    const bytes = encodeForExport(fromPastedText(text, layout)).bytes;
    expect(Buffer.from(bytes).toString("latin1")).toBe(text.replace(/\n/g, "\r\n"));
  });

  it("ESLint acusa trim adicionado em src/core", async () => {
    const eslint = new ESLint({ cwd: join(import.meta.dirname, "..", "..") });
    const [result] = await eslint.lintText('export const f = (s: string) => s.trim() + s.trimEnd() + s.trimStart();\n', {
      filePath: join(import.meta.dirname, "..", "..", "src", "core", "exemplo.ts"),
    });
    expect(result.messages.filter((m) => m.ruleId === "no-restricted-properties")).toHaveLength(3);
  });

  it("ESLint acusa fetch em src/**", async () => {
    const eslint = new ESLint({ cwd: join(import.meta.dirname, "..", "..") });
    const [result] = await eslint.lintText('export const g = () => fetch("https://example.invalid");\n', {
      filePath: join(import.meta.dirname, "..", "..", "src", "ui", "exemplo.ts"),
    });
    expect(result.messages.some((m) => m.ruleId === "no-restricted-globals")).toBe(true);
  });
});
