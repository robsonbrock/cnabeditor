import { describe, expect, it } from "vitest";
import { decodeFile } from "../../src/core/document";
import { validateDocument } from "../../src/core/validate";
import { febrabanCnab240 as layout } from "../../src/layouts/loader";
import { goldenFiles } from "./harness";

describe("golden files: validação", () => {
  for (const g of goldenFiles()) {
    it(`${g.kind}/${g.name}: erros iguais ao expected.json`, () => {
      const report = validateDocument(decodeFile(g.bytes, g.name, layout), layout);
      const actual = report.errors.map((e) => {
        const exp = g.expected.errors.find((x) => x.line === e.line && x.start === e.start && x.rule === e.rule);
        return {
          line: e.line,
          start: e.start,
          end: e.end,
          ...(e.fieldId ? { fieldId: e.fieldId } : {}),
          rule: e.rule,
          ...(exp?.found !== undefined ? { found: e.found } : {}),
          ...(exp?.expected !== undefined ? { expected: e.expected } : {}),
        };
      });
      expect(actual).toEqual(g.expected.errors);
      if (g.kind === "valid") expect(report.errors.every((e) => e.rule === "charset")).toBe(true);
    });
  }
});
