import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateMassa } from "../../src/core/generate/build";
import { loadLayoutFromDir } from "../../src/layouts/node-loader";
import { GOLDEN_CONFIGS, SEED, TODAY } from "../../scripts/generate-golden-gerador";
import { GOLDEN_DIR } from "./harness";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../src/layouts/febraban-cnab240-v10.11"));

/** O gerador, com a mesma semente e data, reproduz os golden files byte a byte (mudança de formato é explícita). */
describe("golden files do gerador de massa", () => {
  it.each(Object.keys(GOLDEN_CONFIGS))("%s", (name) => {
    const { text } = generateMassa(GOLDEN_CONFIGS[name], layout, { seed: SEED, today: TODAY });
    const golden = readFileSync(join(GOLDEN_DIR, "valid", name)).toString("latin1");
    expect(text).toBe(golden);
  });
});
