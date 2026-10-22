import { generateMassa } from "../core/generate/build";
import type { GenerationConfig, LayoutDefinition } from "../core/types";

export type GenIn = { type: "generate"; jobId: number; config: GenerationConfig; seed: number; today: string };
export type GenOut = { type: "done"; jobId: number; text: string; lines: number } | { type: "error"; jobId: number; message: string };

/** Lógica do Worker de geração (contracts/core-api.md › Worker), separada para ser testável. */
export function createGenerationRunner(layout: LayoutDefinition, post: (msg: GenOut) => void) {
  return {
    handle(msg: GenIn) {
      if (msg.type !== "generate") return;
      try {
        const { text, lines } = generateMassa(msg.config, layout, { seed: msg.seed, today: new Date(msg.today) });
        post({ type: "done", jobId: msg.jobId, text, lines });
      } catch (e) {
        post({ type: "error", jobId: msg.jobId, message: e instanceof Error ? e.message : String(e) });
      }
    },
  };
}
