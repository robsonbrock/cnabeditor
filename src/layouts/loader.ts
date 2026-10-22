import type { LayoutDefinition } from "../core/types";
import { assembleLayout, type RawLayoutMeta } from "./assemble";

const files = import.meta.glob("./febraban-cnab240-v10.11/*.json", { eager: true, import: "default" });

function fromGlob(dir: string): LayoutDefinition {
  const entries = Object.entries(files)
    .filter(([path]) => path.startsWith(`./${dir}/`))
    .sort(([a], [b]) => a.localeCompare(b));
  const meta = entries.find(([path]) => path.endsWith("/layout.json"))![1] as RawLayoutMeta;
  const records = entries.filter(([path]) => !path.endsWith("/layout.json")).map(([, json]) => json);
  return assembleLayout(meta, records as Parameters<typeof assembleLayout>[1]);
}

export const febrabanCnab240: LayoutDefinition = fromGlob("febraban-cnab240-v10.11");
