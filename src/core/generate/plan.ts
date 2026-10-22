import type { GenerationConfig, GenerationDirection, GenerationPlan, LayoutDefinition, PlannedBatch, ValueRef } from "../types";

export const resolveValue = (v: ValueRef, direction: GenerationDirection) => (typeof v === "string" ? v : v[direction]);

function resolveValues(values: Record<string, ValueRef>, direction: GenerationDirection): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, resolveValue(v, direction)]));
}

/** Limite de registros: 10^tamanho − 1 do campo countRecords do Trailer de Arquivo (research G6). */
export function maxLinesOf(layout: LayoutDefinition): number {
  const trailer = layout.records.find((r) => r.kind === "fileTrailer");
  const rule = trailer?.totals?.find((t) => t.kind === "countRecords");
  const field = rule && trailer!.fields.find((f) => f.id === rule.field);
  return field ? 10 ** field.size - 1 : Number.MAX_SAFE_INTEGER;
}

/**
 * Lotes e conjuntos a gerar (data-model §4). Cada principal recebe max(principal, dependentes) conjuntos no
 * seu lote, e os dependentes da mesma chave de lote vão nos primeiros conjuntos (FR-013, FR-014). Um
 * dependente que exige outra chave de lote (ex.: J-52 Pix, forma 47) gera os seus conjuntos principal +
 * dependente no lote dessa chave.
 */
export function planGeneration(config: GenerationConfig, layout: LayoutDefinition): GenerationPlan {
  const { direction } = config;
  const quantity = new Map<string, number>();
  for (const s of config.selections) quantity.set(s.variantId, Math.max(quantity.get(s.variantId) ?? 0, s.quantity));

  const batches: PlannedBatch[] = [];
  const keyOf = (header: string, values: Record<string, string>) =>
    `${header}|${JSON.stringify(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)))}`;
  const batchFor = (header: string, values: Record<string, string>, initial: string[] = [], final: string[] = []) => {
    const key = keyOf(header, values);
    let batch = batches.find((b) => b.key === key);
    if (!batch) batches.push((batch = { key, header, values, initial, final, sets: [] }));
    return batch;
  };

  for (const group of layout.generation?.groups ?? []) {
    const principals = group.variants.filter((v) => !v.requires);
    for (const principal of principals) {
      const dependents = group.variants.filter((v) => v.requires === principal.id && quantity.has(v.id));
      const own = quantity.get(principal.id) ?? 0;
      if (own === 0 && dependents.length === 0) continue;
      const values = resolveValues(principal.batch.values, direction);
      const key = keyOf(group.header, values);
      const sameBatch = dependents.filter((d) => keyOf(group.header, resolveValues(d.batch.values, direction)) === key);
      const otherBatch = dependents.filter((d) => !sameBatch.includes(d));
      const count = Math.max(own, ...sameBatch.map((d) => quantity.get(d.id)!));
      const batch = count > 0 ? batchFor(group.header, values, principal.batch.initial, principal.batch.final) : null;
      for (let k = 0; k < count; k++) {
        batch!.sets.push({ principal: principal.id, dependents: sameBatch.filter((d) => quantity.get(d.id)! > k).map((d) => d.id) });
      }
      for (const d of otherBatch) {
        const target = batchFor(group.header, resolveValues(d.batch.values, direction), d.batch.initial, d.batch.final);
        for (let k = 0; k < quantity.get(d.id)!; k++) target.sets.push({ principal: principal.id, dependents: [d.id] });
      }
    }
  }

  const estimatedLines =
    2 + batches.reduce((n, b) => n + 2 + b.initial.length + b.final.length + b.sets.reduce((m, s) => m + 1 + s.dependents.length, 0), 0);
  return { batches, estimatedLines, maxLines: maxLinesOf(layout) };
}
