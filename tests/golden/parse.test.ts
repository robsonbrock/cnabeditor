import { describe, expect, it } from "vitest";
import { decodeFile } from "../../src/core/document";
import { sliceFields } from "../../src/core/fields";
import { febrabanCnab240 as layout } from "../../src/layouts/loader";
import { goldenFiles } from "./harness";

describe("golden files: parse", () => {
  const files = goldenFiles();

  it("toda definição do layout é exercitada por algum golden file (T097)", () => {
    const used = new Set(files.flatMap((g) => decodeFile(g.bytes, g.name, layout).records.map((r) => r.definitionId)));
    expect(layout.records.map((r) => r.id).filter((id) => !used.has(id))).toEqual([]);
  });

  it("há golden files válidos e inválidos", () => {
    expect(files.some((f) => f.kind === "valid")).toBe(true);
    expect(files.some((f) => f.kind === "invalid")).toBe(true);
  });

  for (const g of files) {
    describe(`${g.kind}/${g.name}`, () => {
      const doc = decodeFile(g.bytes, g.name, layout);

      it("direção e rótulos conforme expected.json", () => {
        expect(doc.direction).toBe(g.expected.direction);
        expect(doc.records.map((r) => r.label)).toEqual(g.expected.labels);
        if (g.expected.definitions) expect(doc.records.map((r) => r.definitionId)).toEqual(g.expected.definitions);
      });

      it("os campos de cada linha reconstituem a linha", () => {
        for (const rec of doc.records) {
          const views = sliceFields(rec, layout);
          const joined = views.map((v) => v.value).join("");
          expect(joined, `linha ${rec.index + 1}`).toBe(rec.current.slice(0, joined.length));
          if (rec.current.length <= layout.recordLength) expect(joined).toBe(rec.current);
        }
      });
    });
  }
});
