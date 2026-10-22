import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalog } from "../../../src/core/generate/catalog";
import { canGenerate, validateConfig } from "../../../src/core/generate/selection";
import type { GenerationConfig, LayoutDefinition, Selection } from "../../../src/core/types";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));
export const remessa = buildCatalog(layout, "remessa");

const sel = (variantId: string, quantity = 10, input?: string): Selection => ({ variantId, quantity, auto: false, ...(input !== undefined ? { input } : {}) });
const config = (selections: Selection[], extra: Partial<GenerationConfig> = {}): GenerationConfig => ({ direction: "remessa", selections, companyAccount: {}, ...extra });

/** O mesmo layout com o campo "quantidade de registros do arquivo" de 3 posições: limite de 999 linhas. */
function withSmallTrailer(): LayoutDefinition {
  const records = layout.records.map((r) => {
    if (r.kind !== "fileTrailer") return r;
    const rule = r.totals!.find((t) => t.kind === "countRecords")!;
    return { ...r, fields: r.fields.map((f) => (f.id === rule.field ? { ...f, size: 3, end: f.start + 2 } : f)) };
  });
  return { ...layout, records };
}

describe("validateConfig (FR-005–FR-010)", () => {
  it("sem seleção: \"Marque ao menos um segmento\" e Gerar desabilitado", () => {
    const issues = validateConfig(config([]), layout);
    expect(issues.form).toBe("Marque ao menos um segmento");
    expect(canGenerate(issues)).toBe(false);
  });

  it("quantidade vazia vale 10; inválida é sinalizada por variação", () => {
    expect(validateConfig(config([sel("segmento-a-pagamento", 10, "")]), layout).plan.estimatedLines).toBe(14);
    for (const raw of ["0", "10001", "1.5", "abc", "-1"]) {
      const issues = validateConfig(config([sel("segmento-a-pagamento", 10, raw)]), layout);
      expect(issues.fields["quantity:segmento-a-pagamento"], raw).toBe("Informe um número inteiro de 1 a 10.000");
      expect(canGenerate(issues)).toBe(false);
    }
  });

  it("acima de 100.000 linhas avisa, sem bloquear", () => {
    const issues = validateConfig(config(["segmento-a-pagamento", "segmento-j-pagamento", "segmento-o-pagamento", "segmento-p-cobranca", "segmento-a-debito", "segmento-d-custodia", "segmento-h-consignacao", "segmento-k-vendor", "segmento-a-compror", "segmento-y-02-alegacao-pagador", "segmento-n-darf-pagamento"].map((id) => sel(id, 10_000))), layout);
    expect(issues.warning).toBe("110.024 linhas: a geração pode demorar");
    expect(canGenerate(issues)).toBe(true);
  });

  it("acima do limite do Trailer de Arquivo bloqueia, com o limite lido da definição (edge case)", () => {
    const small = withSmallTrailer();
    const issues = validateConfig(config([sel("segmento-a-pagamento", 996)]), small);
    expect(issues.plan.maxLines).toBe(999);
    expect(issues.form).toBe("Total de 1.000 linhas excede o limite de 999");
    expect(canGenerate(issues)).toBe(false);
    expect(validateConfig(config([sel("segmento-a-pagamento", 995)]), small).form).toBeUndefined();
  });
});
