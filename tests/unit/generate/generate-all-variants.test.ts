import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fromPastedText } from "../../../src/core/document";
import { buildCatalog } from "../../../src/core/generate/catalog";
import { generateMassa } from "../../../src/core/generate/build";
import type { GenerationDirection } from "../../../src/core/types";
import { validateRecord } from "../../../src/core/validate/record";
import { validateStructure } from "../../../src/core/validate/structure";
import { validateTotals } from "../../../src/core/validate/totals";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));
const TODAY = new Date(2026, 9, 22, 10, 30, 0);
const SEEDS = [1, 42, 2026];

function errorsOf(text: string) {
  const doc = fromPastedText(text, layout);
  return [...doc.records.flatMap((r) => validateRecord(r, layout)), ...validateStructure(doc, layout), ...validateTotals(doc, layout)];
}

/** SC-001: cada variação, em cada direção em que existe, gera um arquivo sem nenhum erro de validação. */
describe.each<GenerationDirection>(["remessa", "retorno"])("todas as variações em %s", (direction) => {
  const variants = buildCatalog(layout, direction).flatMap((g) => g.variants.map((v) => ({ ...v, group: g.label })));

  it.each(variants.map((v) => [`${v.group} › ${v.label}`, v.id] as const))("%s", (_name, variantId) => {
    for (const seed of SEEDS) {
      const { text } = generateMassa({ direction, selections: [{ variantId, quantity: 3, auto: false }], companyAccount: {} }, layout, { seed, today: TODAY });
      const errors = errorsOf(text).map((e) => `linha ${e.line} ${e.fieldName ?? ""} [${e.rule}] ${e.message} (encontrado "${e.found}")`);
      expect(errors, `${variantId}, semente ${seed}`).toEqual([]);
    }
  });
});
