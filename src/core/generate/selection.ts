// Regras da modal do gerador, puras e testáveis sem UI (contracts/core-api.md › Seleção e Validação).
import type { FieldDefinition, GenerationConfig, GenerationDirection, GenerationPlan, LayoutDefinition, Selection } from "../types";
import { buildCatalog, displayName, findVariant, type CatalogGroup, type CatalogVariant } from "./catalog";
import { planGeneration } from "./plan";

export const DEFAULT_QUANTITY = 10;
export const MAX_QUANTITY = 10_000;
/** Acima disso a modal avisa que a geração pode demorar (edge case da spec). */
export const SLOW_LINES = 100_000;

export interface SelectionChange {
  selections: Selection[];
  notices: string[];
  refused?: string;
}

export interface ConfigIssues {
  fields: Record<string, string>;
  form?: string;
  warning?: string;
  plan: GenerationPlan;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");
const QTY = /^[0-9]+$/;

function variantOf(catalog: CatalogGroup[], id: string): CatalogVariant | undefined {
  for (const g of catalog) {
    const v = g.variants.find((x) => x.id === id);
    if (v) return v;
  }
  return undefined;
}

/** Quantidade efetiva: vazio ⇒ 10; inválida ⇒ null. */
export function parseQuantity(raw: string): number | null {
  if (raw === "") return DEFAULT_QUANTITY;
  if (!QTY.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_QUANTITY ? n : null;
}

/** FR-013: o principal fica com a maior quantidade entre a sua e a dos dependentes. */
function normalize(sel: Selection[], catalog: CatalogGroup[], changedId: string | null, notices: string[]): Selection[] {
  const label = (id: string) => variantOf(catalog, id)?.label ?? id;
  return sel.map((s) => {
    const v = variantOf(catalog, s.variantId);
    const deps = sel.filter((d) => v?.dependents.includes(d.variantId));
    if (!deps.length) return s;
    const top = deps.reduce((a, b) => (b.quantity > a.quantity ? b : a));
    if (top.quantity <= s.quantity) return s;
    notices.push(
      changedId === s.variantId
        ? `${label(s.variantId)} não pode ter menos registros que ${label(top.variantId)}: mantido em ${fmt(top.quantity)}`
        : `Quantidade de ${label(s.variantId)} ajustada para ${fmt(top.quantity)} para acompanhar ${label(top.variantId)}`,
    );
    return { ...s, quantity: top.quantity, input: String(top.quantity) };
  });
}

/** Marca ou desmarca uma variação (FR-011, FR-012). */
export function toggleVariant(sel: Selection[], variantId: string, on: boolean, catalog: CatalogGroup[]): SelectionChange {
  const label = (id: string) => variantOf(catalog, id)?.label ?? id;
  const v = variantOf(catalog, variantId);
  const notices: string[] = [];
  const has = (id: string) => sel.some((s) => s.variantId === id);
  if (on) {
    if (has(variantId)) {
      // Principal incluído automaticamente e marcado pelo usuário: deixa de ser automático.
      return { selections: sel.map((s) => (s.variantId === variantId ? { ...s, auto: false } : s)), notices };
    }
    let next: Selection[] = [...sel, { variantId, quantity: DEFAULT_QUANTITY, input: String(DEFAULT_QUANTITY), auto: false }];
    if (v?.requires && !has(v.requires)) {
      next.push({ variantId: v.requires, quantity: DEFAULT_QUANTITY, input: String(DEFAULT_QUANTITY), auto: true });
      notices.push(`${label(v.requires)} foi incluído porque ${label(variantId)} depende dele`);
    }
    next = normalize(next, catalog, variantId, notices);
    return { selections: order(next, catalog), notices };
  }
  const markedDeps = (v?.dependents ?? []).filter(has);
  if (markedDeps.length) {
    return {
      selections: sel,
      notices,
      refused: `${label(variantId)} é necessário enquanto ${markedDeps.map(label).join(", ")} estiver marcado`,
    };
  }
  let next = sel.filter((s) => s.variantId !== variantId);
  const principal = v?.requires && next.find((s) => s.variantId === v.requires);
  if (principal && principal.auto && !variantOf(catalog, principal.variantId)!.dependents.some((d) => next.some((s) => s.variantId === d))) {
    next = next.filter((s) => s !== principal);
  }
  return { selections: next, notices };
}

/** Quantidade digitada (FR-006, FR-013); o texto é guardado como digitado para a validação. */
export function setQuantity(sel: Selection[], variantId: string, raw: string, catalog: CatalogGroup[]): SelectionChange {
  const notices: string[] = [];
  const parsed = parseQuantity(raw);
  let next = sel.map((s) => (s.variantId === variantId ? { ...s, input: raw, quantity: parsed ?? s.quantity } : s));
  if (parsed !== null) next = normalize(next, catalog, variantId, notices);
  return { selections: next, notices };
}

/** Troca de direção: remove o que não existe na nova direção, com aviso por serviço (US4-1). */
export function changeDirection(sel: Selection[], direction: GenerationDirection, layout: LayoutDefinition): SelectionChange {
  const next = buildCatalog(layout, direction);
  const keep = sel.filter((s) => variantOf(next, s.variantId));
  const removed = sel.filter((s) => !keep.includes(s));
  if (!removed.length) return { selections: keep, notices: [] };
  const byGroup = new Map<string, string[]>();
  for (const s of removed) {
    const group = displayName(layout, findVariant(layout, s.variantId)?.header ?? "");
    byGroup.set(group, [...(byGroup.get(group) ?? []), displayName(layout, s.variantId)]);
  }
  const list = [...byGroup].map(([g, names]) => `${g}: ${names.join(", ")}`).join("; ");
  const where = direction === "retorno" ? "Retorno" : "Remessa";
  return { selections: keep, notices: [`Removidos por não existirem em ${where}: ${list}`] };
}

/** Seleções na ordem do catálogo, para a lista e o plano ficarem estáveis. */
function order(sel: Selection[], catalog: CatalogGroup[]): Selection[] {
  const pos = new Map(catalog.flatMap((g) => g.variants.map((v) => v.id)).map((id, i) => [id, i]));
  return [...sel].sort((a, b) => (pos.get(a.variantId) ?? 0) - (pos.get(b.variantId) ?? 0));
}

/** Limites dos campos de conta da empresa, lidos do Header de Arquivo (nota → campo). */
export function companyFieldLimits(layout: LayoutDefinition): Record<"agencia" | "digitoAgencia" | "conta" | "digitoConta" | "digitoAgenciaConta", FieldDefinition | undefined> {
  const header = layout.records.find((r) => r.kind === "fileHeader");
  const byRef = (ref: string) => header?.fields.find((f) => f.reference === ref);
  return { agencia: byRef("G008"), digitoAgencia: byRef("G009"), conta: byRef("G010"), digitoConta: byRef("G011"), digitoAgenciaConta: byRef("G012") };
}

const DV = /^[A-Z0-9]$/;

/** Validação da modal (FR-005–FR-010, edge cases de quantidade e limite). */
export function validateConfig(config: GenerationConfig, layout: LayoutDefinition): ConfigIssues {
  const fields: Record<string, string> = {};
  for (const s of config.selections) {
    if (s.input !== undefined && parseQuantity(s.input) === null) fields[`quantity:${s.variantId}`] = "Informe um número inteiro de 1 a 10.000";
  }
  if (config.bankCode && !/^[0-9]{3}$/.test(config.bankCode)) fields.bankCode = "Informe exatamente 3 dígitos";
  const limits = companyFieldLimits(layout);
  for (const key of ["agencia", "conta"] as const) {
    const value = config.companyAccount[key];
    const f = limits[key];
    if (value && f && !new RegExp(`^[0-9]{1,${f.size}}$`).test(value)) fields[key] = `Use apenas dígitos, até ${f.size}`;
  }
  for (const key of ["digitoAgencia", "digitoConta", "digitoAgenciaConta"] as const) {
    const value = config.companyAccount[key];
    if (value && !DV.test(value)) fields[key] = "Use 1 dígito ou letra maiúscula";
  }

  const plan = planGeneration(config, layout);
  const issues: ConfigIssues = { fields, plan };
  if (!config.selections.length) issues.form = "Marque ao menos um segmento";
  else if (plan.estimatedLines > plan.maxLines) issues.form = `Total de ${fmt(plan.estimatedLines)} linhas excede o limite de ${fmt(plan.maxLines)}`;
  else if (plan.estimatedLines > SLOW_LINES) issues.warning = `${fmt(plan.estimatedLines)} linhas: a geração pode demorar`;
  return issues;
}

/** Gerar habilitado: há seleção, nenhum campo inválido e o total cabe no arquivo. */
export const canGenerate = (issues: ConfigIssues) => !issues.form && Object.keys(issues.fields).length === 0;
