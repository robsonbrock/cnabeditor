# Data Model: Editor CNAB 240

**Feature**: `001-cnab240-editor` | **Date**: 2026-10-22 | **Plan**: [plan.md](plan.md)

Modelos em memória do navegador (TypeScript). Nada é persistido além de `Preferences` (FR-034). Tipos completos da API em [contracts/core-api.md](contracts/core-api.md); formato da definição de layout em [contracts/layout-definition.schema.json](contracts/layout-definition.schema.json).

---

## 1. Definições de layout (dados estáticos, Princípio I)

### LayoutDefinition

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | ex.: `febraban-cnab240-v10.11` |
| `name` | string | "Layout Padrão CNAB 240" |
| `version` | string | `10.11` |
| `publishedAt` | string (ISO date) | `2023-08-21` |
| `source` | `{ title, url }` | URL do PDF oficial (FR-028) |
| `recordLength` | number | `240` |
| `domains` | `Record<string, AllowedValue[]>` | tabelas compartilhadas (ex.: `tipoRegistro`, `tipoInscricao`) |
| `records` | `RecordDefinition[]` | ≥ 1 |

### RecordDefinition

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | único no layout (ex.: `detalhe-cobranca-P`) |
| `kind` | `"fileHeader" \| "batchHeader" \| "detail" \| "batchTrailer" \| "fileTrailer" \| "batchInitial" \| "batchFinal"` | |
| `label` | string | rótulo do quadro: `HA`, `HL`, `TL`, `TA`; para `detail` é o Código Segmento (FR-009a) |
| `title` | string | ex.: "Detalhe – Segmento P" (FR-010) |
| `match` | `MatchRule[]` | todas devem ser satisfeitas; ver R6 |
| `fields` | `FieldDefinition[]` | ordenados por `start`; cobrem 1..`recordLength` sem buraco nem sobreposição |
| `totals` | `TotalRule[]` | só em `batchTrailer`/`fileTrailer` |

### MatchRule

- `{ "pos": [start, end], "equals": "3" }` ou `{ "pos": [start, end], "in": ["01","02"] }` — sobre a própria linha.
- `{ "batch": "operation" | "service" | "layoutVersion", "in": [...] }` — sobre o contexto do lote corrente (herdado do Header de Lote).

### FieldDefinition

| Campo | Tipo | Regras |
|---|---|---|
| `id` | string | único no registro (ex.: `numeroInscricaoEmpresa`) |
| `name` | string | título exibido ("Número de Inscrição da Empresa") |
| `start`, `end` | number | 1-based, inclusivos; `start ≤ end ≤ 240` |
| `size` | number (derivado) | `end − start + 1` |
| `type` | `"N" \| "A" \| "D" \| "H" \| "V"` | numérico, alfanumérico, data DDMMAAAA, hora HHMMSS, valor |
| `decimals` | number | só para `V`; ≥ 0 |
| `required` | boolean | |
| `description` | string | texto do manual (FR-013) |
| `reference` | string? | nota do manual (ex.: "G001") |
| `domain` | `AllowedValue[]` ou `{ "ref": "<domainId>" }` | presente ⇒ campo codificado (FR-014) |
| `sensitive` | boolean? | CPF/CNPJ, agência/conta — mascarado em logs (Princípio V) |

### AllowedValue

| Campo | Tipo |
|---|---|
| `code` | string (comprimento = `size` do campo) |
| `meaning` | string |

### TotalRule

| Campo | Tipo | Regras |
|---|---|---|
| `field` | string | id de campo do próprio trailer |
| `kind` | `"countRecords" \| "countBatches" \| "sum"` | |
| `source` | `{ records: string[], field: string }` | obrigatório quando `kind = "sum"` |

---

## 2. Estado do documento (runtime)

### CnabDocument ("Arquivo CNAB")

| Campo | Tipo | Notas |
|---|---|---|
| `origin` | `"file" \| "paste"` | define regras de exportação (FR-025 vs FR-025a/b) |
| `fileName` | string? | só `origin = "file"` |
| `encoding` | `"iso-8859-1" \| "utf-8"` | detectado (R2); `paste` ⇒ `iso-8859-1` na exportação |
| `bom` | boolean | BOM UTF-8 presente no original |
| `direction` | `"remessa" \| "retorno" \| "unknown"` | Header de Arquivo pos. 143 (FR-007) |
| `records` | `CnabRecord[]` | ordem do arquivo; `records.length` = "N linhas" (FR-009d) |
| `flags` | `Uint8Array` | bit 0 = alterada, bit 1 = com erro; índice = número da linha − 1 |
| `hasUnexportedChanges` | boolean | true após qualquer atualização/recálculo; false após exportar ou carregar (FR-008) |

### CnabRecord ("Registro / linha")

| Campo | Tipo | Notas |
|---|---|---|
| `index` | number | 0-based; "Linha i+1 de N" |
| `original` | string | conteúdo carregado (imutável) |
| `current` | string | conteúdo atual |
| `terminator` | `"CRLF" \| "LF" \| "CR" \| ""` | original (R3) |
| `definitionId` | string \| null | null ⇒ não reconhecido (rótulo `?`, campo bruto único) |
| `label` | string | derivado (FR-009a) |
| `batchContext` | `BatchContext \| null` | discriminadores herdados do HL |

Derivados (não armazenados): `length = current.length`; `isChanged = current !== original` (FR-009c); `fields` = fatiamento de `current` pela definição (até onde houver caracteres — edge case de linha curta).

### BatchContext

`{ batchIndex, headerLine, operation, service, layoutVersion }` — lidos do Header de Lote conforme `match` das definições de HL.

### EditSession (quadro de edição da linha selecionada)

| Campo | Tipo | Notas |
|---|---|---|
| `recordIndex` | number | linha selecionada |
| `values` | `Record<fieldId, string>` | valores nas caixas de texto |
| `baseline` | `Record<fieldId, string>` | trecho atual da linha no quadro principal |
| `fieldErrors` | `Record<fieldId, ValidationError[]>` | resultado da última validação por campo |
| `focusedFieldId` | string \| null | alimenta o painel de detalhes (FR-013) |
| `isDirty` | boolean (derivado) | algum `values[f] !== baseline[f]` (FR-022) |

### ValidationError ("Erro de validação")

| Campo | Tipo | Notas |
|---|---|---|
| `line` | number | 1-based |
| `start`, `end` | number | posições; para erros de linha/estrutura cobre a linha |
| `fieldId`, `fieldName` | string? | ausentes em erros de estrutura |
| `found` | string | valor encontrado (mascarado em logs se `sensitive`) |
| `expected` | string? | trailers: valor esperado (FR-023a) |
| `rule` | `ValidationRule` | ver abaixo |
| `message` | string | pt-BR, ex.: `Opção inválida: "8" não é um valor permitido para este campo` |
| `trigger` | `"input" \| "blur" \| "file"` | quando a regra pode disparar (FR-015/FR-015b) |

`ValidationRule` ∈ `length` (campo), `type` (caractere inválido para o tipo), `required`, `domain`, `date`, `time`, `charset` (alfanumérico fora do padrão FEBRABAN), `lineLength`, `sequence` (ordem HA→HL→detalhes→TL→TA), `batchNumber`, `recordSequence`, `unknownRecord`, `totalMismatch`, `totalOverflow`.

### ValidationReport

`{ errors: ValidationError[], byLine: Map<number, ValidationError[]>, total: number, status: "running" | "done" }` — produzido pelo Worker (R9); o contador de erros (FR-016a) navega por `errors` em ordem de linha/posição.

### RecalcChange

`{ line, recordTitle, fieldName, from, to }` — lista exibida após "Recalcular totais" (FR-023b). Lista vazia ⇒ "não havia divergências" (cenário US3-8).

### Preferences ("Preferências do usuário")

`{ theme: "dark" | "light", wrap: boolean, splitMainPct: number, splitRightPct: number }` — padrões `dark`, `true`, `55`, `55` (painel de detalhes = 45%). Ver [contracts/preferences.md](contracts/preferences.md).

### Toast ("Aviso")

`{ id, kind: "success" | "error", text, createdAt, durationMs: 5000 }` — fila independente; cada um expira sozinho (FR-035/FR-036).

---

## 3. Relações

```text
LayoutDefinition 1──* RecordDefinition 1──* FieldDefinition *──? AllowedValue[]
                                         └──* TotalRule
CnabDocument 1──* CnabRecord *──? RecordDefinition (via definitionId)
CnabRecord *──? BatchContext
CnabDocument 1──1 ValidationReport 1──* ValidationError ──> CnabRecord (line)
EditSession ──> CnabRecord (recordIndex)
```

## 4. Regras de validação (origem → regra)

| Requisito | Regra | Gatilho |
|---|---|---|
| FR-015, FR-017 | `length` (> size bloqueado na entrada) | input |
| FR-015 | `type` (N/V/D/H só dígitos) | input |
| FR-015 | `domain`, `date`, `time`, `required` | blur (e carga do arquivo) |
| Princípio III | `charset` alfanumérico | blur (e carga) |
| FR-016 | `lineLength` (≠ 240), `sequence`, `batchNumber`, `recordSequence` | carga e após atualizar/recalcular |
| FR-023a | `totalMismatch` com `found`/`expected` | carga e após atualizar/recalcular |
| FR-023 | `unknownRecord` (informativo; registro preservado) | carga |

## 5. Transições de estado

### Documento

```text
Vazio ──importar/colar──▶ Carregado(limpo)
Carregado(limpo) ──Atualizar linha / Recalcular──▶ Carregado(com alterações)
Carregado(com alterações) ──Exportar──▶ Carregado(limpo, flags "alterada" mantidas)
Carregado(*) ──importar/colar──▶ [se com alterações: confirmar (FR-008)] ──▶ Carregado(limpo, flags zeradas)
Carregado ──conteúdo vazio──▶ Vazio (exportar/copiar desabilitados)
```

Observação: o indicador "alterada" compara com `original` (FR-009c), independente de exportação; `hasUnexportedChanges` só controla o aviso de substituição.

### Linha selecionada / sessão de edição

```text
Sem seleção ──clique/↑↓──▶ Selecionada(limpa)
Selecionada(limpa) ──digitar──▶ Selecionada(suja)
Selecionada(suja) ──Atualizar linha──▶ Selecionada(limpa) + toast + revalidação da linha e dos trailers
Selecionada(suja) ──Descartar──▶ Selecionada(limpa)
Selecionada(suja) ──clique/↑↓ outra linha──▶ Diálogo{Atualizar | Descartar | Cancelar}
    Atualizar ─▶ aplica e troca │ Descartar ─▶ troca │ Cancelar ─▶ permanece
```

### Campo (caixa de texto)

```text
Válido ──input viola length/type──▶ Erro(input)
Erro(input) ──input corrige──▶ Válido
* ──blur──▶ reavalia todas as regras ──▶ Válido | Erro(atual)
```
