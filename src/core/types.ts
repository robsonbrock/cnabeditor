// Tipos do domínio (data-model.md). Posições são 1-based e inclusivas.

// ---------- Definições de layout (dados estáticos, Princípio I) ----------

export interface AllowedValue {
  code: string;
  meaning: string;
}

export type FieldType = "N" | "A" | "D" | "H" | "V";

export type BatchDiscriminator = "operation" | "service" | "layoutVersion";

export interface FieldDefinition {
  id: string;
  name: string;
  start: number;
  end: number;
  /** Derivado pelo carregador: end - start + 1. */
  size: number;
  type: FieldType;
  /** Só para V; >= 0. */
  decimals?: number;
  required: boolean;
  description: string;
  reference?: string;
  domain?: AllowedValue[] | { ref: string };
  sensitive?: boolean;
  /** Só em Header de Lote: o campo alimenta o discriminador do contexto do lote. */
  batchContext?: BatchDiscriminator;
}

export type MatchRule =
  | { pos: [number, number]; equals: string }
  | { pos: [number, number]; in: string[] }
  | { batch: BatchDiscriminator; in: string[] };

export type RecordKind =
  | "fileHeader"
  | "batchHeader"
  | "batchInitial"
  | "detail"
  | "batchFinal"
  | "batchTrailer"
  | "fileTrailer";

export interface TotalRule {
  field: string;
  kind: "countRecords" | "countBatches" | "sum";
  /** Obrigatório quando kind = "sum". */
  source?: { records: string[]; field: string };
}

export interface RecordDefinition {
  id: string;
  kind: RecordKind;
  label: string;
  title: string;
  match: MatchRule[];
  fields: FieldDefinition[];
  totals?: TotalRule[];
}

export interface LayoutDefinition {
  id: string;
  name: string;
  version: string;
  publishedAt: string;
  source: { title: string; url: string };
  recordLength: number;
  domains: Record<string, AllowedValue[]>;
  records: RecordDefinition[];
  /** generation.json da pasta do layout; ausente ⇒ layout sem gerador de massa. */
  generation?: GenerationMeta;
}

// ---------- Metadados de geração de massa (generation.json, dado do layout) ----------

export type GenerationDirection = "remessa" | "retorno";

export type StrategyName =
  | "blank"
  | "inscricao"
  | "agencia"
  | "conta"
  | "dv"
  | "banco"
  | "nomePessoa"
  | "nomeEmpresa"
  | "valor"
  | "dataFutura"
  | "dataPassada"
  | "hora"
  | "codigoBarras44"
  | "pixKey"
  | "endereco"
  | "cidade"
  | "cep"
  | "uf"
  | "documento"
  | "ocorrenciaRetorno";

export type StrategyRef = StrategyName | Record<GenerationDirection, StrategyName>;

/** Valor fixo, igual nas duas direções ou um por direção. */
export type ValueRef = string | Record<GenerationDirection, string>;

export interface VariantMeta {
  /** Id de uma RecordDefinition de detalhe; o nome exibido é o title dela sem "Detalhe – ". */
  id: string;
  directions: GenerationDirection[];
  /** Id da variação principal do mesmo grupo; pode variar com a direção (ex.: Y-01 depende de P na remessa e de T no retorno). */
  requires?: ValueRef;
  batch: {
    /** Valor por id de campo do Header de Lote do grupo. */
    values: Record<string, ValueRef>;
    initial?: string[];
    final?: string[];
  };
  /** Valores fixos por id de campo do detalhe. */
  fixed?: Record<string, ValueRef>;
}

export interface GroupMeta {
  /** Id do Header de Lote; o nome exibido é o title dele sem "Header de Lote – ". */
  header: string;
  variants: VariantMeta[];
}

export interface CompanyMeta {
  kinds: RecordKind[];
  records: Record<string, string[]>;
}

export interface GenerationMeta {
  bankFieldId: string;
  groups: GroupMeta[];
  company: CompanyMeta;
  /** Nota FEBRABAN → estratégia. */
  strategies: Record<string, StrategyRef>;
  /** "recordId.fieldId" → estratégia; prevalece sobre `strategies`. */
  fieldStrategies?: Record<string, StrategyRef>;
  /** "recordId.fieldId" → valor fixo, para registros que não são variações (ex.: Header de Arquivo). */
  fixed?: Record<string, ValueRef>;
  excluded?: { id: string; reason: string }[];
}

// ---------- Configuração e resultado da geração ----------

export interface Selection {
  variantId: string;
  /** Quantidade efetiva (1–10.000). */
  quantity: number;
  /** Texto como digitado no campo de quantidade; ausente ⇒ quantity. */
  input?: string;
  /** Incluída automaticamente como principal de um dependente (FR-011). */
  auto: boolean;
}

export interface CompanyAccountInput {
  agencia?: string;
  digitoAgencia?: string;
  conta?: string;
  digitoConta?: string;
  digitoAgenciaConta?: string;
}

export interface GenerationConfig {
  direction: GenerationDirection;
  selections: Selection[];
  bankCode?: string;
  companyAccount: CompanyAccountInput;
}

export interface PlannedSet {
  principal: string;
  dependents: string[];
}

export interface PlannedBatch {
  key: string;
  header: string;
  /** Trailer de Lote que fecha o lote ("" se nenhum aceita os valores: erro de metadados). */
  trailer: string;
  values: Record<string, string>;
  initial: string[];
  final: string[];
  sets: PlannedSet[];
}

export interface GenerationPlan {
  batches: PlannedBatch[];
  estimatedLines: number;
  maxLines: number;
}

export interface GenerationResult {
  text: string;
  lines: number;
}

// ---------- Estado do documento (runtime) ----------

export type Terminator = "CRLF" | "LF" | "CR" | "";
export type Encoding = "iso-8859-1" | "utf-8";
export type Direction = "remessa" | "retorno" | "unknown";

export interface BatchContext {
  batchIndex: number;
  headerLine: number;
  operation: string;
  service: string;
  layoutVersion: string;
}

export interface CnabRecord {
  /** 0-based. */
  index: number;
  /** Conteúdo carregado (imutável). */
  original: string;
  current: string;
  terminator: Terminator;
  definitionId: string | null;
  label: string;
  batchContext: BatchContext | null;
  /** Detalhe resolvido ignorando as regras de lote: o segmento não pertence ao serviço do lote. */
  batchMismatch?: boolean;
}

/** Bits de CnabDocument.flags. */
export const FLAG_CHANGED = 1;
export const FLAG_ERROR = 2;

export interface CnabDocument {
  origin: "file" | "paste";
  fileName?: string;
  encoding: Encoding;
  bom: boolean;
  direction: Direction;
  records: CnabRecord[];
  /** bit 0 = alterada, bit 1 = com erro; índice = número da linha - 1. */
  flags: Uint8Array;
  hasUnexportedChanges: boolean;
}

export interface EditSession {
  recordIndex: number;
  values: Record<string, string>;
  baseline: Record<string, string>;
  fieldErrors: Record<string, ValidationError[]>;
  focusedFieldId: string | null;
}

// ---------- Validação ----------

export type Trigger = "input" | "blur";

export type ValidationRule =
  | "length"
  | "type"
  | "required"
  | "domain"
  | "date"
  | "time"
  | "charset"
  | "lineLength"
  | "sequence"
  | "batchNumber"
  | "recordSequence"
  | "unknownRecord"
  | "batchMismatch"
  | "totalMismatch"
  | "totalOverflow";

export interface ValidationError {
  /** 1-based. */
  line: number;
  start: number;
  end: number;
  fieldId?: string;
  fieldName?: string;
  found: string;
  expected?: string;
  rule: ValidationRule;
  message: string;
  trigger: "input" | "blur" | "file";
}

export interface ValidationReport {
  errors: ValidationError[];
  byLine: Map<number, ValidationError[]>;
  total: number;
  status: "running" | "done";
}

export interface RecalcChange {
  line: number;
  recordTitle: string;
  fieldName: string;
  from: string;
  to: string;
}

// ---------- Visões e saída ----------

export interface FieldView {
  /** Registro não reconhecido ⇒ campo sintético "Conteúdo bruto" 1..len. */
  def: FieldDefinition;
  /** Pode ser menor que def.size em linha curta. */
  value: string;
  filled: number;
}

export interface ExportPlan {
  bytes: Uint8Array;
  /** FR-025b; só origin = "paste". position é 1-based, em code points. */
  unmappable: { line: number; position: number; char: string }[];
}

// ---------- Interface ----------

export interface Preferences {
  theme: "dark" | "light";
  wrap: boolean;
  splitMainPct: number;
  splitRightPct: number;
}

export interface Toast {
  id: number;
  kind: "success" | "error";
  text: string;
  createdAt: number;
  durationMs: number;
}
