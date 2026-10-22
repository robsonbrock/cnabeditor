import type { BatchContext, CnabRecord, LayoutDefinition, MatchRule, RecordDefinition } from "./types";

/** Posição 8 (Tipo de Registro) não é lida aqui: o índice só agrupa definições pelo próprio `match`. */
interface LayoutIndex {
  byId: Map<string, RecordDefinition>;
  /** Chave: valor exigido por uma regra { pos: [p, p], equals } de 1 caractere; "" = sem regra desse tipo. */
  buckets: Map<string, RecordDefinition[]>;
  keyPos: number | null;
}

const indexes = new WeakMap<LayoutDefinition, LayoutIndex>();

/** Escolhe a posição de 1 caractere mais usada nas regras `equals` para agrupar definições. */
function buildIndex(layout: LayoutDefinition): LayoutIndex {
  const counts = new Map<number, number>();
  for (const rec of layout.records) {
    for (const m of rec.match) {
      if ("pos" in m && "equals" in m && m.pos[0] === m.pos[1]) counts.set(m.pos[0], (counts.get(m.pos[0]) ?? 0) + 1);
    }
  }
  const keyPos = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const buckets = new Map<string, RecordDefinition[]>();
  for (const rec of layout.records) {
    const keyRule = rec.match.find((m) => "pos" in m && "equals" in m && m.pos[0] === keyPos && m.pos[1] === keyPos);
    const key = keyRule && "equals" in keyRule ? keyRule.equals : "";
    buckets.set(key, [...(buckets.get(key) ?? []), rec]);
  }
  return { byId: new Map(layout.records.map((r) => [r.id, r])), buckets, keyPos };
}

export function layoutIndex(layout: LayoutDefinition): LayoutIndex {
  let idx = indexes.get(layout);
  if (!idx) indexes.set(layout, (idx = buildIndex(layout)));
  return idx;
}

export function definitionOf(layout: LayoutDefinition, id: string | null): RecordDefinition | null {
  return id === null ? null : (layoutIndex(layout).byId.get(id) ?? null);
}

function ruleHolds(rule: MatchRule, text: string, ctx: BatchContext | null): boolean {
  if ("batch" in rule) return ctx !== null && rule.in.includes(ctx[rule.batch]);
  if (text.length < rule.pos[1]) return false;
  const value = text.slice(rule.pos[0] - 1, rule.pos[1]);
  return "equals" in rule ? value === rule.equals : rule.in.includes(value);
}

/** Vence a definição com mais condições satisfeitas; empate ou nenhuma ⇒ null (R6). */
export function matchRecord(text: string, ctx: BatchContext | null, layout: LayoutDefinition): RecordDefinition | null {
  const idx = layoutIndex(layout);
  const candidates = [
    ...(idx.keyPos !== null ? (idx.buckets.get(text.charAt(idx.keyPos - 1)) ?? []) : []),
    ...(idx.buckets.get("") ?? []),
  ];
  let best: RecordDefinition | null = null;
  let bestCount = -1;
  let tie = false;
  for (const rec of candidates) {
    if (!rec.match.every((rule) => ruleHolds(rule, text, ctx))) continue;
    if (rec.match.length > bestCount) {
      best = rec;
      bestCount = rec.match.length;
      tie = false;
    } else if (rec.match.length === bestCount) {
      tie = true;
    }
  }
  return tie ? null : best;
}

function readContext(def: RecordDefinition, text: string, batchIndex: number, headerLine: number): BatchContext {
  const ctx: BatchContext = { batchIndex, headerLine, operation: "", service: "", layoutVersion: "" };
  for (const f of def.fields) {
    if (f.batchContext) ctx[f.batchContext] = text.slice(f.start - 1, f.end);
  }
  return ctx;
}

/** Rótulo de não reconhecido: detalhe ⇒ caractere da pos. do Código Segmento; outros ⇒ "?". */
function fallbackLabel(text: string, layout: LayoutDefinition): string {
  const segmentPos = detailSegmentPos(layout);
  if (segmentPos === null) return "?";
  const { typePos, typeValue, pos } = segmentPos;
  if (text.charAt(typePos - 1) !== typeValue) return "?";
  const c = text.charAt(pos - 1);
  return c === "" || c === " " ? "?" : c;
}

/** Deduz das definições de detalhe onde ficam o Tipo de Registro e o Código Segmento (nada fixo no motor). */
function detailSegmentPos(layout: LayoutDefinition): { typePos: number; typeValue: string; pos: number } | null {
  const detail = layout.records.find((r) => r.kind === "detail");
  if (!detail) return null;
  const single = detail.match.filter(
    (m): m is { pos: [number, number]; equals: string } => "pos" in m && "equals" in m && m.pos[0] === m.pos[1],
  );
  const idx = layoutIndex(layout);
  const typeRule = single.find((m) => m.pos[0] === idx.keyPos);
  const segRule = single.find((m) => m.equals === detail.label && m !== typeRule);
  return typeRule && segRule ? { typePos: typeRule.pos[0], typeValue: typeRule.equals, pos: segRule.pos[0] } : null;
}

/**
 * Atribui definitionId, label e batchContext (R6). O contexto do lote vem do último Header de Lote e
 * vale para os registros seguintes até o Trailer de Lote, inclusive. Não altera conteúdo.
 */
export function resolveRecords(records: CnabRecord[], layout: LayoutDefinition): void {
  resolveRange(records, layout, 0, records.length, null, -1);
}

const kindOf = (rec: CnabRecord, layout: LayoutDefinition) => definitionOf(layout, rec.definitionId)?.kind;

/**
 * Re-resolve depois de editar o registro `index` sem percorrer o arquivo inteiro: o contexto só flui do
 * Header de Lote até o Trailer de Lote, então basta ir do HL que abre o lote até o próximo HL.
 * Se o registro deixar de ser ou passar a ser Header de Lote, a numeração dos lotes muda: tudo é refeito.
 */
export function resolveAround(records: CnabRecord[], layout: LayoutDefinition, index: number): void {
  const rec = records[index];
  const oldKind = kindOf(rec, layout);
  // Detalhes (e registros 2/4) não mudam o contexto do lote: basta re-resolver a própria linha.
  const affectsContext = (k: string | undefined) => k === undefined || k === "batchHeader" || k === "batchTrailer" || k === "fileHeader" || k === "fileTrailer";
  if (!affectsContext(oldKind)) {
    const def = matchRecord(rec.current, rec.batchContext, layout);
    if (!affectsContext(def?.kind)) {
      rec.definitionId = def!.id;
      rec.label = def!.label;
      return;
    }
  }
  const wasHeader = oldKind === "batchHeader";
  let start = index;
  for (let i = index - 1; i >= 0; i--) {
    const kind = kindOf(records[i], layout);
    if (kind === "batchHeader") {
      start = i;
      break;
    }
    if (kind === "batchTrailer") break;
  }
  const prev = records[start - 1];
  const ctx = start === index && prev && kindOf(prev, layout) !== "batchTrailer" ? prev.batchContext : null;
  let end = index + 1;
  while (end < records.length && kindOf(records[end], layout) !== "batchHeader") end++;
  const batchIndex = (records[start].batchContext ?? ctx)?.batchIndex ?? -1;
  resolveRange(records, layout, start, end, ctx, kindOf(records[start], layout) === "batchHeader" ? batchIndex - 1 : batchIndex);
  if (wasHeader !== (kindOf(records[index], layout) === "batchHeader")) resolveRecords(records, layout);
}

function resolveRange(
  records: CnabRecord[],
  layout: LayoutDefinition,
  from: number,
  to: number,
  initialCtx: BatchContext | null,
  initialBatchIndex: number,
): void {
  let ctx = initialCtx;
  let batchIndex = initialBatchIndex;
  for (let i = from; i < to; i++) {
    const rec = records[i];
    let def = matchRecord(rec.current, ctx, layout);
    if (def?.kind === "batchHeader") {
      batchIndex++;
      ctx = readContext(def, rec.current, batchIndex, rec.index + 1);
      // Com o contexto do próprio lote, uma definição de HL mais específica pode passar a valer.
      def = matchRecord(rec.current, ctx, layout) ?? def;
    }
    rec.definitionId = def?.id ?? null;
    rec.label = def ? def.label : fallbackLabel(rec.current, layout);
    rec.batchContext = def?.kind === "fileHeader" || def?.kind === "fileTrailer" ? null : ctx;
    if (def?.kind === "batchTrailer") ctx = null;
  }
}
