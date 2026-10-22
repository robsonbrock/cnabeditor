// Valida cada layout em src/layouts/** contra contracts/layout-definition.schema.json (Princípio I).
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadLayoutFromDir } from "../src/layouts/node-loader";

const root = join(import.meta.dirname, "..");
const schema = JSON.parse(
  readFileSync(join(root, "specs/001-cnab240-editor/contracts/layout-definition.schema.json"), "utf8"),
);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats.default(ajv);
const validate = ajv.compile(schema);
const generationSchema = JSON.parse(
  readFileSync(join(root, "specs/003-gerador-massa-testes/contracts/generation-metadata.schema.json"), "utf8"),
);
const validateGeneration = ajv.compile(generationSchema);

const layoutsDir = join(root, "src/layouts");
let failed = false;

for (const name of readdirSync(layoutsDir)) {
  const dir = join(layoutsDir, name);
  if (!statSync(dir).isDirectory()) continue;
  const layout = loadLayoutFromDir(dir);
  // size é derivado pelo carregador e não faz parte do formato em disco.
  const { generation, ...withoutGeneration } = layout;
  if (generation && !validateGeneration(generation)) {
    failed = true;
    console.error(`✗ ${name}/generation.json:`);
    for (const err of validateGeneration.errors ?? []) console.error(`  ${err.instancePath}: ${err.message}`);
  } else if (generation) {
    console.log(`✓ ${name}/generation.json válido`);
  }
  const onDisk = {
    ...withoutGeneration,
    records: layout.records.map((r) => ({ ...r, fields: r.fields.map(({ size: _size, ...f }) => f) })),
  };
  if (validate(onDisk)) {
    console.log(`✓ ${name}: ${layout.records.length} registros válidos`);
    continue;
  }
  failed = true;
  console.error(`✗ ${name}:`);
  for (const err of validate.errors ?? []) {
    const [, , recIdx] = err.instancePath.split("/");
    const recId = recIdx !== undefined ? ` (${layout.records[Number(recIdx)]?.id})` : "";
    console.error(`  ${err.instancePath}${recId}: ${err.message}`);
  }
}

process.exit(failed ? 1 : 0);
