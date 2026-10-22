import { describe, expect, it } from "vitest";
import { decodeFile } from "../../src/core/document";
import { recalculateTotals, validateDocument } from "../../src/core/validate";
import { febrabanCnab240 as layout } from "../../src/layouts/loader";
import { goldenFiles } from "./harness";

describe("golden files: recalcular totais", () => {
  for (const g of goldenFiles()) {
    it(`${g.kind}/${g.name}`, () => {
      const doc = decodeFile(g.bytes, g.name, layout);
      const { records, changes } = recalculateTotals(doc, layout);
      const expected = g.expected.recalc ?? [];
      expect(changes.map((c) => ({ line: c.line, from: c.from, to: c.to }))).toEqual(expected.map(({ line, from, to }) => ({ line, from, to })));
      for (const [i, text] of records) {
        doc.records[i].current = text;
        expect(text).toHaveLength(doc.records[i].original.length);
      }
      expect(validateDocument(doc, layout).errors.filter((e) => e.rule === "totalMismatch")).toEqual([]);
    });
  }
});
