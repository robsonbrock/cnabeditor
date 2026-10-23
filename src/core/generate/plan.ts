import { definitionOf } from "../resolve";
import type { GenerationConfig, GenerationDirection, GenerationPlan, LayoutDefinition, PlannedBatch, RecordDefinition, ValueRef } from "../types";
import { requiresFor } from "./catalog";

export const resolveValue = (v: ValueRef, direction: GenerationDirection) => (typeof v === "string" ? v : v[direction]);

function resolveValues(values: Record<string, ValueRef>, direction: GenerationDirection): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, resolveValue(v, direction)]));
}

/** 10^tamanho − 1 do campo countRecords de um trailer: quantos registros ele consegue contar (research G6). */
function countCapacity(trailer: RecordDefinition | undefined): number {
  const rule = trailer?.totals?.find((t) => t.kind === "countRecords");
  const field = rule && trailer!.fields.find((f) => f.id === rule.field);
  return field ? 10 ** field.size - 1 : Number.MAX_SAFE_INTEGER;
}

/** Limite de registros do arquivo: capacidade do Trailer de Arquivo. */
export function maxLinesOf(layout: LayoutDefinition): number {
  return countCapacity(layout.records.find((r) => r.kind === "fileTrailer"));
}

/** Trailer de Lote: a definição cujas regras de lote aceitam os valores do header gerado (a mais específica). */
export function trailerFor(layout: LayoutDefinition, headerId: string, values: Record<string, string>): string | null {
  const header = definitionOf(layout, headerId);
  if (!header) return null;
  const ctx: Record<string, string> = {};
  for (const f of header.fields) if (f.batchContext && values[f.id] !== undefined) ctx[f.batchContext] = values[f.id];
  const candidates = layout.records
    .filter((r) => r.kind === "batchTrailer")
    .map((r) => ({ r, rules: r.match.filter((m) => "batch" in m) }))
    .filter(({ rules }) => rules.every((m) => "batch" in m && m.in.includes(ctx[m.batch] ?? "")))
    .sort((a, b) => b.rules.length - a.rules.length);
  return candidates[0]?.r.id ?? null;
}

const setLines = (b: PlannedBatch) => b.sets.reduce((m, s) => m + 1 + s.dependents.length, 0);

/**
 * Divide um lote cujo total de registros (header + iniciais + conjuntos + finais + trailer) passa do que o
 * campo countRecords do seu trailer comporta (ex.: Vendor, 2 dígitos ⇒ 99). Conjuntos nunca são partidos.
 */
function splitByCapacity(batch: PlannedBatch, layout: LayoutDefinition): PlannedBatch[] {
  const room = countCapacity(definitionOf(layout, batch.trailer) ?? undefined) - 2 - batch.initial.length - batch.final.length;
  if (setLines(batch) <= room || room <= 0) return [batch];
  const parts: PlannedBatch[] = [];
  let current: PlannedBatch = { ...batch, sets: [] };
  let used = 0;
  for (const set of batch.sets) {
    const size = 1 + set.dependents.length;
    if (used + size > room && current.sets.length) {
      parts.push(current);
      current = { ...batch, sets: [] };
      used = 0;
    }
    current.sets.push(set);
    used += size;
  }
  parts.push(current);
  return parts;
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
    if (!batch) batches.push((batch = { key, header, trailer: trailerFor(layout, header, values) ?? "", values, initial, final, sets: [] }));
    return batch;
  };

  for (const group of layout.generation?.groups ?? []) {
    const principals = group.variants.filter((v) => !requiresFor(v, direction));
    for (const principal of principals) {
      const dependents = group.variants.filter((v) => requiresFor(v, direction) === principal.id && quantity.has(v.id));
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

  const split = batches.flatMap((b) => splitByCapacity(b, layout));
  const estimatedLines = 2 + split.reduce((n, b) => n + 2 + b.initial.length + b.final.length + setLines(b), 0);
  return { batches: split, estimatedLines, maxLines: maxLinesOf(layout) };
}
