// Só para Node (testes e scripts); o navegador usa loader.ts com import.meta.glob.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { LayoutDefinition } from "../core/types";
import { assembleLayout } from "./assemble";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));

/** Arquivos de definição de registro (tudo exceto layout.json), em ordem alfabética. */
export function recordFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f !== "layout.json")
    .sort();
}

export function loadLayoutFromDir(dir: string): LayoutDefinition {
  return assembleLayout(
    readJson(join(dir, "layout.json")),
    recordFiles(dir).map((f) => readJson(join(dir, f))),
  );
}
