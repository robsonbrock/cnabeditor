// Monta a massa de testes a partir do layout e do generation.json (contracts/core-api.md › Geração).
import { fromPastedText } from "../document";
import { definitionOf } from "../resolve";
import type {
  AllowedValue,
  CompanyAccountInput,
  FieldDefinition,
  GenerationConfig,
  GenerationDirection,
  GenerationMeta,
  GenerationResult,
  LayoutDefinition,
  MatchRule,
  RecordDefinition,
  StrategyRef,
} from "../types";
import { padValue } from "../validate/field";
import { REF_LOTE, REF_SEQUENCIAL } from "../validate/structure";
import { recalculateTotals } from "../validate/totals";
import { findVariant } from "./catalog";
import { planGeneration, resolveValue } from "./plan";
import { createRng, type Rng } from "./rng";
import { STRATEGIES, type StrategyContext } from "./strategies";

/** Notas de controle lidas pelo gerador, como REF_LOTE/REF_SEQUENCIAL no validador de estrutura. */
const REF_REMESSA_RETORNO = "G015";
const REF_DATA_GERACAO = "G016";
const REF_HORA_GERACAO = "G017";
/** Notas dos dados da empresa (G005 tipo de inscrição … G013 nome), na ordem do perfil. */
const COMPANY_REFS = ["G005", "G006", "G007", "G008", "G009", "G010", "G011", "G012", "G013"] as const;
type CompanyRef = (typeof COMPANY_REFS)[number];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const two = (n: number) => String(n).padStart(2, "0");

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}

/** Perfil da empresa e banco do arquivo: iguais em todo o arquivo (FR-021, FR-027). */
function companyProfile(rng: Rng, config: GenerationConfig): { bank: string; values: Record<CompanyRef, string> } {
  const d = (n: number) => rng.digits(n);
  const account: CompanyAccountInput = config.companyAccount;
  const cnpjField = { id: "", name: "", start: 1, end: 14, size: 14, type: "N", required: false, description: "" } as FieldDefinition;
  const ctx: StrategyContext = { field: cnpjField, rng, today: new Date(), direction: config.direction, scratch: { tipoInscricao: "2" }, nextId: () => 0 };
  return {
    bank: config.bankCode || d(3),
    values: {
      G005: "2",
      G006: STRATEGIES.inscricao(ctx),
      G007: d(9),
      G008: account.agencia || String(rng.int(1, 9999)),
      G009: account.digitoAgencia || d(1),
      G010: account.conta || String(rng.int(10_000, 99_999_999)),
      G011: account.digitoConta || d(1),
      G012: account.digitoAgenciaConta || d(1),
      // Já completado com espaços até 30; campos menores recebem o corte, maiores o restante em espaços.
      G013: STRATEGIES.nomeEmpresa({ ...ctx, field: { ...cnpjField, type: "A", size: 30, end: 30 } }),
    },
  };
}

function domainValues(f: FieldDefinition, layout: LayoutDefinition): AllowedValue[] | null {
  if (!f.domain) return null;
  return Array.isArray(f.domain) ? f.domain : (layout.domains[f.domain.ref] ?? null);
}

function randomText(rng: Rng, size: number): string {
  let out = "";
  for (let i = 0; i < size; i++) out += LETTERS[rng.int(0, 25)];
  return out;
}

/** Valor padrão por tipo (research G4, item 6): obrigatório ⇒ aleatório válido; opcional ⇒ vazio. */
function byType(f: FieldDefinition, ctx: StrategyContext): string {
  if (!f.required) return padValue(f, "");
  switch (f.type) {
    case "D":
      return STRATEGIES.dataFutura(ctx);
    case "H":
      return STRATEGIES.hora(ctx);
    case "A":
      return randomText(ctx.rng, f.size);
    default:
      return ctx.rng.digits(f.size);
  }
}

interface Builder {
  layout: LayoutDefinition;
  gen: GenerationMeta;
  config: GenerationConfig;
  rng: Rng;
  today: Date;
  profile: ReturnType<typeof companyProfile>;
  nextId: () => number;
}

interface RecordInput {
  defId: string;
  lote: number | "file" | "trailer";
  seq: number;
  /** batch.values (header) ou fixed (detalhe), por id de campo. */
  fixed: Record<string, string>;
}

function strategyFor(gen: GenerationMeta, def: RecordDefinition, f: FieldDefinition, direction: GenerationDirection) {
  const ref: StrategyRef | undefined = gen.fieldStrategies?.[`${def.id}.${f.id}`] ?? (f.reference ? gen.strategies[f.reference] : undefined);
  return ref === undefined ? undefined : typeof ref === "string" ? ref : ref[direction];
}

function isCompanyField(gen: GenerationMeta, def: RecordDefinition, f: FieldDefinition): f is FieldDefinition & { reference: CompanyRef } {
  if (gen.company.records[def.id]?.includes(f.id)) return true;
  return gen.company.kinds.includes(def.kind) && (COMPANY_REFS as readonly string[]).includes(f.reference ?? "");
}

const MAX_ATTEMPTS = 50;
const posRules = (def: RecordDefinition) => def.match.filter((m): m is Exclude<MatchRule, { batch: unknown }> => "pos" in m);

function holds(rule: Exclude<MatchRule, { batch: unknown }>, line: string): boolean {
  const v = line.slice(rule.pos[0] - 1, rule.pos[1]);
  return "equals" in rule ? v === rule.equals : rule.in.includes(v);
}

/**
 * Uma variação genérica (ex.: Segmento J) pode, por sorteio, trazer o valor que identifica uma mais
 * específica (J-52 nas pos. 18–19): nesse caso a linha é sorteada de novo (research G2).
 */
function shadowedBy(layout: LayoutDefinition, def: RecordDefinition, line: string): RecordDefinition | undefined {
  const own = posRules(def).length;
  return layout.records.find((r) => r !== def && r.kind === def.kind && posRules(r).length > own && posRules(r).every((m) => holds(m, line)));
}

function buildRecord(b: Builder, input: RecordInput): string {
  const def = definitionOf(b.layout, input.defId);
  if (!def) throw new GenerationError(`Definição inexistente no layout: ${input.defId}`);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const line = buildLine(b, def, input);
    if (!shadowedBy(b.layout, def, line)) return line;
  }
  throw new GenerationError(`Não foi possível gerar uma linha reconhecida como ${def.id}`);
}

function buildLine(b: Builder, def: RecordDefinition, input: RecordInput): string {
  const { layout, gen, config, rng, today, profile } = b;
  const ctx: StrategyContext = { field: def.fields[0], rng, today, direction: config.direction, scratch: {}, nextId: b.nextId };
  const topFixed = gen.fixed ?? {};
  let line = "";
  for (const f of def.fields) {
    ctx.field = f;
    const fixed = input.fixed[f.id] ?? (topFixed[`${def.id}.${f.id}`] !== undefined ? resolveValue(topFixed[`${def.id}.${f.id}`], config.direction) : undefined);
    let value: string;
    if (fixed !== undefined) value = padValue(f, fixed);
    else if (f.id === gen.bankFieldId) value = padValue(f, profile.bank);
    else if (isCompanyField(gen, def, f)) {
      const raw = profile.values[f.reference];
      value = f.type === "A" ? padValue(f, raw.slice(0, f.size)) : padValue(f, raw.slice(-f.size));
      if (f.reference === "G005") ctx.scratch.tipoInscricao = raw;
    } else if (f.reference === REF_LOTE) {
      value = input.lote === "file" ? padValue(f, "0") : input.lote === "trailer" ? "9".repeat(f.size) : padValue(f, String(input.lote));
    } else if (f.reference === REF_SEQUENCIAL) value = padValue(f, String(input.seq));
    else if (f.reference === REF_REMESSA_RETORNO) value = config.direction === "remessa" ? "1" : "2";
    else if (f.reference === REF_DATA_GERACAO) value = `${two(today.getDate())}${two(today.getMonth() + 1)}${today.getFullYear()}`;
    else if (f.reference === REF_HORA_GERACAO) value = `${two(today.getHours())}${two(today.getMinutes())}${two(today.getSeconds())}`;
    else {
      const strategy = strategyFor(gen, def, f, config.direction);
      const domain = strategy ? null : domainValues(f, layout);
      if (strategy) value = STRATEGIES[strategy](ctx);
      // Opcional com domínio: o vazio também é um sorteio válido (e evita casar uma variação mais específica).
      else if (domain && domain.length) value = !f.required && rng.int(0, domain.length) === 0 ? padValue(f, "") : padValue(f, rng.pick(domain).code);
      else value = byType(f, ctx);
    }
    line += value.length === f.size ? value : padValue(f, value.slice(0, f.size));
  }
  line = line.padEnd(layout.recordLength, " ");
  // Identificação: as regras `match` da definição valem sobre qualquer valor gerado (research G2).
  for (const rule of def.match) {
    if (!("pos" in rule)) continue;
    const [start, end] = rule.pos;
    const current = line.slice(start - 1, end);
    const target = "equals" in rule ? rule.equals : rule.in.includes(current) ? current : rule.in[0];
    line = line.slice(0, start - 1) + target + line.slice(end);
  }
  return line;
}

/** Gera o arquivo completo (FR-015–FR-027). Mesmos config, seed e today ⇒ saída idêntica. */
export function generateMassa(config: GenerationConfig, layout: LayoutDefinition, opts: { seed: number; today: Date }): GenerationResult {
  const gen = layout.generation;
  if (!gen) throw new GenerationError("Este layout não define segmentos para geração");
  const plan = planGeneration(config, layout);
  const rng = createRng(opts.seed);
  let counter = 0;
  const b: Builder = { layout, gen, config, rng, today: opts.today, profile: companyProfile(rng, config), nextId: () => ++counter };
  const fileHeader = layout.records.find((r) => r.kind === "fileHeader");
  const fileTrailer = layout.records.find((r) => r.kind === "fileTrailer");
  if (!fileHeader || !fileTrailer) throw new GenerationError("Layout sem Header ou Trailer de Arquivo");

  const lines: string[] = [];
  const expected: string[] = [];
  const push = (input: RecordInput) => {
    lines.push(buildRecord(b, input));
    expected.push(input.defId);
  };

  push({ defId: fileHeader.id, lote: "file", seq: 0, fixed: {} });
  plan.batches.forEach((batch, i) => {
    const lote = i + 1;
    let seq = 0;
    push({ defId: batch.header, lote, seq: 0, fixed: batch.values });
    for (const id of batch.initial) push({ defId: id, lote, seq: ++seq, fixed: {} });
    for (const set of batch.sets) {
      for (const id of [set.principal, ...set.dependents]) {
        const variant = findVariant(layout, id)?.variant;
        if (!variant) throw new GenerationError(`Variação inexistente no generation.json: ${id}`);
        const fixed = Object.fromEntries(Object.entries(variant.fixed ?? {}).map(([k, v]) => [k, resolveValue(v, config.direction)]));
        push({ defId: id, lote, seq: ++seq, fixed });
      }
    }
    for (const id of batch.final) push({ defId: id, lote, seq: ++seq, fixed: {} });
    if (!batch.trailer) throw new GenerationError(`Nenhum Trailer de Lote aceita o lote ${batch.header}`);
    push({ defId: batch.trailer, lote, seq: ++seq, fixed: {} });
  });
  push({ defId: fileTrailer.id, lote: "trailer", seq: 0, fixed: {} });

  // Totalizadores pela mesma regra do validador (research G6), depois conferência da identificação.
  const doc = fromPastedText(lines.join("\r\n") + "\r\n", layout);
  for (const [i, text] of recalculateTotals(doc, layout).records) doc.records[i].current = text;
  doc.records.forEach((rec, i) => {
    const want = expected[i];
    if (rec.definitionId !== want || rec.batchMismatch) {
      throw new GenerationError(`Linha ${i + 1} gerada para ${want} foi reconhecida como ${rec.definitionId ?? "registro desconhecido"}`);
    }
  });
  const text = doc.records.map((r) => r.current).join("\r\n") + "\r\n";
  return { text, lines: doc.records.length };
}
