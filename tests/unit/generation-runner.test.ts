import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { GenerationConfig } from "../../src/core/types";
import { loadLayoutFromDir } from "../../src/layouts/node-loader";
import { createGenerationRunner, type GenOut } from "../../src/workers/generation-runner";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../src/layouts/febraban-cnab240-v10.11"));
const config: GenerationConfig = { direction: "remessa", selections: [{ variantId: "segmento-a-pagamento", quantity: 2, auto: false }], companyAccount: {} };
const today = new Date(2026, 9, 22).toISOString();

describe("generation worker", () => {
  it("generate devolve done com o texto e o total de linhas do mesmo job", () => {
    const out: GenOut[] = [];
    createGenerationRunner(layout, (m) => out.push(m)).handle({ type: "generate", jobId: 7, config, seed: 1, today });
    expect(out).toHaveLength(1);
    const msg = out[0];
    expect(msg.type).toBe("done");
    if (msg.type !== "done") return;
    expect(msg.jobId).toBe(7);
    expect(msg.lines).toBe(6);
    expect(msg.text.split("\r\n")).toHaveLength(7);
  });

  it("falha de geração vira { type: \"error\", message }", () => {
    const out: GenOut[] = [];
    const bare = { ...layout, generation: undefined };
    createGenerationRunner(bare, (m) => out.push(m)).handle({ type: "generate", jobId: 3, config, seed: 1, today });
    expect(out).toEqual([{ type: "error", jobId: 3, message: "Este layout não define segmentos para geração" }]);
  });
});
