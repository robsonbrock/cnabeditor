// Gera os golden files do gerador de massa (T053) com semente e data fixas: protegem o formato da saída.
// Somente dados fictícios (Princípio V). Uso: npx tsx scripts/generate-golden-gerador.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fromPastedText } from "../src/core/document";
import { generateMassa } from "../src/core/generate/build";
import type { GenerationConfig } from "../src/core/types";
import { loadLayoutFromDir } from "../src/layouts/node-loader";

const root = join(import.meta.dirname, "..");
const layout = loadLayoutFromDir(join(root, "src/layouts/febraban-cnab240-v10.11"));
const outDir = join(root, "tests/golden/febraban-cnab240-v10.11/valid");

export const SEED = 20261022;
export const TODAY = new Date(2026, 9, 22, 10, 30, 0);

const pick = (direction: GenerationConfig["direction"], ids: string[], extra: Partial<GenerationConfig> = {}): GenerationConfig => ({
  direction,
  selections: ids.map((variantId) => ({ variantId, quantity: 2, auto: false })),
  companyAccount: {},
  ...extra,
});

export const GOLDEN_CONFIGS: Record<string, GenerationConfig> = {
  "gerador-remessa.rem": pick(
    "remessa",
    ["segmento-a-pagamento", "segmento-b-pagamento", "segmento-j-pagamento", "segmento-j-52-pix-pagamento", "segmento-o-pagamento", "segmento-n-darf-pagamento", "segmento-p-cobranca", "segmento-q-cobranca", "segmento-a-debito"],
    { bankCode: "033", companyAccount: { agencia: "1234", digitoAgencia: "5", conta: "56789", digitoConta: "0" } },
  ),
  "gerador-retorno.ret": pick("retorno", ["segmento-a-pagamento", "segmento-z-pagamento", "segmento-t-cobranca", "segmento-u-cobranca", "segmento-e-conciliacao", "segmento-f-gestao-caixa"]),
};

if (process.argv[1]?.endsWith("generate-golden-gerador.ts")) {
  for (const [name, config] of Object.entries(GOLDEN_CONFIGS)) {
    const { text } = generateMassa(config, layout, { seed: SEED, today: TODAY });
    const doc = fromPastedText(text, layout);
    writeFileSync(join(outDir, name), text, "latin1");
    const expected = { direction: doc.direction, labels: doc.records.map((r) => r.label), definitions: doc.records.map((r) => r.definitionId), errors: [] };
    writeFileSync(join(outDir, `${name}.expected.json`), JSON.stringify(expected, null, 2) + "\n");
    console.log(`tests/golden/febraban-cnab240-v10.11/valid/${name}: ${doc.records.length} linhas`);
  }
}
