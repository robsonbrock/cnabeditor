import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Direction, ValidationRule } from "../../src/core/types";

export const LAYOUT_ID = "febraban-cnab240-v10.11";
export const GOLDEN_DIR = join(import.meta.dirname, LAYOUT_ID);

export interface ExpectedError {
  line: number;
  start: number;
  end: number;
  fieldId?: string;
  rule: ValidationRule;
  found?: string;
  expected?: string;
}

export interface Expected {
  direction: Direction;
  labels: string[];
  /** Definição esperada por linha (golden files de cobertura). */
  definitions?: string[];
  errors: ExpectedError[];
  recalc?: { line: number; fieldId: string; from: string; to: string }[];
}

export interface GoldenFile {
  kind: "valid" | "invalid";
  name: string;
  path: string;
  bytes: Uint8Array;
  expected: Expected;
}

const EXT = /\.(rem|ret|txt)$/i;

export function goldenFiles(): GoldenFile[] {
  const out: GoldenFile[] = [];
  for (const kind of ["valid", "invalid"] as const) {
    const dir = join(GOLDEN_DIR, kind);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((f) => EXT.test(f)).sort()) {
      const path = join(dir, name);
      const expectedPath = `${path}.expected.json`;
      if (!existsSync(expectedPath)) throw new Error(`golden file sem expected.json: ${kind}/${name}`);
      out.push({
        kind,
        name,
        path,
        bytes: new Uint8Array(readFileSync(path)),
        expected: JSON.parse(readFileSync(expectedPath, "utf8")),
      });
    }
  }
  return out;
}
