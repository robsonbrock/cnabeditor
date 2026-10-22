# Contract: Core API (`src/core`)

Módulo TypeScript puro (sem DOM), consumido pela UI e pelo Worker de validação. É a fronteira testada por golden files (Princípio IV). Tipos de dados em [../data-model.md](../data-model.md).

Convenções: posições 1-based e inclusivas; funções puras, sem efeitos colaterais; nenhuma função usa `trim`; valores monetários só como string de dígitos ou `bigint`.

## Carga

```ts
/** Lê bytes de um arquivo importado. Detecta encoding/BOM, divide registros preservando terminadores. */
function decodeFile(bytes: Uint8Array, fileName: string, layout: LayoutDefinition): CnabDocument;

/** Texto confirmado na janela "Colar conteúdo" (FR-006b): nenhum caractere é alterado. */
function fromPastedText(text: string, layout: LayoutDefinition): CnabDocument;

/** Extensões aceitas para importação (FR-005). */
function isAcceptedExtension(fileName: string): boolean; // .rem | .ret | .txt (case-insensitive)
```

Garantias:
- `encodeForExport(decodeFile(b, …)).bytes` é idêntico a `b` (FR-025, SC-002).
- `fromPastedText(t).records.map(r => r.current + sep(r)).join("") === t`, com `sep` = `\n` para terminadores não vazios (forma normalizada do textarea).

## Resolução de registros

```ts
/** Atribui definitionId, label e batchContext a cada registro (R6). Não altera conteúdo. */
function resolveRecords(records: CnabRecord[], layout: LayoutDefinition): void;

function detectDirection(doc: CnabDocument): "remessa" | "retorno" | "unknown"; // FR-007

/** Fatia o conteúdo atual pelos campos da definição; linha curta → campos até onde houver caracteres. */
function sliceFields(record: CnabRecord, layout: LayoutDefinition): FieldView[];

interface FieldView {
  def: FieldDefinition;          // registro não reconhecido → campo sintético "Conteúdo bruto" 1..len
  value: string;                 // pode ser menor que def.size em linha curta
  filled: number;                // contador "preenchido" (R7)
}
```

## Validação

```ts
type Trigger = "input" | "blur";

/** Regras de campo para o momento indicado (FR-015/FR-015b). "blur" avalia todas. */
function validateField(def: FieldDefinition, value: string, trigger: Trigger, layout: LayoutDefinition): ValidationError[];

/** Regras de uma linha isolada (todos os campos + tamanho). */
function validateRecord(record: CnabRecord, layout: LayoutDefinition): ValidationError[];

/** Arquivo inteiro: campos, sequência, numeração de lote, sequenciais e totalizadores (FR-016, FR-023a). */
function validateDocument(doc: CnabDocument, layout: LayoutDefinition): ValidationReport;

/** Lista de opções com destaque do valor atual (FR-014). match = null → valor não corresponde a nenhuma opção. */
function describeDomain(def: FieldDefinition, value: string, layout: LayoutDefinition):
  { options: AllowedValue[]; match: AllowedValue | null } | null;
```

## Edição

```ts
/**
 * Reescreve a linha a partir dos valores editados (FR-018/FR-019).
 * Campos com value === baseline reaproveitam o trecho original sem padding.
 * Campos alterados: N/V/D/H → padStart("0"), A → padEnd(" "). Nunca trunca.
 * Retorna a nova string; caracteres fora dos campos editados permanecem idênticos.
 */
function applyEdits(current: string, fields: FieldDefinition[], values: Record<string, string>,
                    baseline: Record<string, string>): string;

/** Recalcula totalizadores existentes (FR-023b/c). Não cria nem remove registros. */
function recalculateTotals(doc: CnabDocument, layout: LayoutDefinition):
  { records: Map<number, string>; changes: RecalcChange[]; errors: ValidationError[] };
```

## Exportação

```ts
interface ExportPlan {
  bytes: Uint8Array;
  unmappable: { line: number; position: number; char: string }[]; // FR-025b; só origin = "paste"
}

/**
 * origin "file": encoding, BOM e terminadores originais por registro (FR-025).
 * origin "paste": ISO-8859-1, terminadores não vazios → CRLF, quebra final preservada,
 *                 caracteres > U+00FF gravados como "?" (FR-025a/b).
 */
function encodeForExport(doc: CnabDocument): ExportPlan;

/** Texto para a área de transferência: conteúdo atual + terminadores originais, sem rótulos (FR-027/FR-027a). */
function toClipboardText(doc: CnabDocument): string;

/** cnabeditor_AAAAMMDDHHMMSS.<ext> pelo relógio local (FR-024a). */
function exportFileName(now: Date, ext: "rem" | "ret"): string;
```

## Worker de validação (`src/workers/validation.worker.ts`)

Mensagens (structured clone):

| Direção | Mensagem |
|---|---|
| UI → Worker | `{ type: "validate", jobId, records: string[] }` (conteúdo atual de cada registro) |
| UI → Worker | `{ type: "cancel", jobId }` |
| Worker → UI | `{ type: "progress", jobId, processed, total, errors: ValidationError[] }` (lotes de ~5.000 linhas) |
| Worker → UI | `{ type: "done", jobId, total }` |

O Worker carrega o mesmo layout por import estático; não acessa rede (CSP `connect-src 'none'`).
