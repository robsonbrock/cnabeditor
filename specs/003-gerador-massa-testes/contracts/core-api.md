# Contrato: API do gerador (`src/core/generate`)

Biblioteca pura, sem DOM e sem rede, usada pelo worker e pelos testes. Ela complementa [../../001-cnab240-editor/contracts/core-api.md](../../001-cnab240-editor/contracts/core-api.md). Os tipos estão em [data-model.md](../data-model.md).

## Catálogo

```ts
/** Variações selecionáveis para a direção, agrupadas e na ordem de generation.json (FR-003, FR-004). */
function buildCatalog(layout: LayoutDefinition, direction: "remessa" | "retorno"): CatalogGroup[];

interface CatalogGroup { header: string; label: string; variants: CatalogVariant[] }
interface CatalogVariant { id: string; label: string; requires?: string; dependents: string[] }
```

- Retorna `[]` quando o layout não tem `generation`; a modal então mostra "Este layout não define segmentos para geração" e mantém Gerar desabilitado (o botão continua visível).
- Variações em `generation.excluded` nunca aparecem.
- `label` vem do layout, nunca do `generation.json`:
  - grupo: `title` do Header de Lote sem "Header de Lote – ";
  - variação: `title` do detalhe sem "Detalhe – ".

  São os nomes oficiais do manual FEBRABAN, como transcritos.
- `dependents` é o inverso de `requires`, calculado aqui.

## Seleção (regras da modal, puras e testáveis sem UI)

```ts
function toggleVariant(sel: Selection[], variantId: string, on: boolean, catalog: CatalogGroup[]): SelectionChange;
function setQuantity(sel: Selection[], variantId: string, raw: string, catalog: CatalogGroup[]): SelectionChange;
function changeDirection(sel: Selection[], next: CatalogGroup[]): SelectionChange;

interface SelectionChange {
  selections: Selection[];
  /** Mensagens informativas para a modal, ex.: "Segmento P foi incluído porque Segmento Q depende dele". */
  notices: string[];
  /** Tentativa recusada (ex.: desmarcar principal com dependente marcado), com o motivo. */
  refused?: string;
}
```

Comportamento:
- **FR-011/FR-012**: marcar um dependente inclui o principal com `auto = true`. Um principal com dependente marcado não pode ser desmarcado. Desmarcar o último dependente remove o principal que tiver `auto = true`.
- **Marcar uma variação** cria a seleção com `quantity = 10`.
- **FR-013**: depois de qualquer `setQuantity`, no principal ou num dependente, o principal fica com `max(principal, dependentes)`, e o ajuste gera um aviso. Textos em [data-model.md §2](../data-model.md).
- **Mudança de direção**: as seleções sem a nova direção são removidas, e um aviso lista quais.

## Validação da configuração

```ts
function validateConfig(config: GenerationConfig, layout: LayoutDefinition): ConfigIssues;

interface ConfigIssues {
  /** Por campo da modal: "bankCode", "agencia", "quantity:<variantId>", ... */
  fields: Record<string, string>;
  /** "Marque ao menos um segmento" (FR-005) ou "Total de N linhas excede o limite de M" (edge case). */
  form?: string;
  /** Aviso não bloqueante: total > 100.000 linhas. */
  warning?: string;
  plan: GenerationPlan;
}
```

Regras e mensagens:

| Campo | Regra | Mensagem |
|---|---|---|
| Quantidade | Inteiro de 1 a 10.000; vazio vale 10 | "Informe um número inteiro de 1 a 10.000" |
| `bankCode` | `/^\d{3}$/` | "Informe exatamente 3 dígitos" |
| Agência / conta | Só dígitos, até o tamanho do campo no Header de Arquivo | "Use apenas dígitos, até N" |
| DVs | 1 caractere no charset FEBRABAN | — |

## Geração

```ts
function planGeneration(config: GenerationConfig, layout: LayoutDefinition): GenerationPlan;

function generateMassa(
  config: GenerationConfig,
  layout: LayoutDefinition,
  opts: { seed: number; today: Date },
): GenerationResult;
```

Garantias (data-model §5):
- Cada linha tem `layout.recordLength` caracteres.
- Os registros são separados por CRLF, com CRLF final.
- Sem caracteres fora do ISO-8859-1.
- Com o mesmo `config`, `seed` e `today`, a saída é idêntica byte a byte.
- Os totalizadores são preenchidos por `recalculateTotals`.

`generateMassa` lança `GenerationError` quando os metadados são inconsistentes, por exemplo quando uma linha montada não resolve para a variação. Isso é defeito de layout e é coberto por teste; a UI mostra um toast de erro (FR-030).

## Estratégias

Os nomes aceitos em `generation.json` são todos parametrizados pelo `FieldDefinition` (tamanho, tipo, decimais), nunca por posição.

| Nome | Produz |
|---|---|
| `blank` | Espaços (A) ou zeros (N/V/D/H). |
| `inscricao` | Lê o campo de tipo de inscrição irmão (nota G005 no mesmo registro) e gera CPF (11) ou CNPJ (14) com DV válido, alinhado à direita com zeros. Sorteia o tipo entre 1 e 2 quando o campo de tipo também é gerado. |
| `banco` | Código fictício de 3 dígitos (terceiros). |
| `agencia` / `conta` | Dígitos no tamanho do campo, sem zero à esquerda significativo. |
| `dv` | 1 dígito. |
| `nomePessoa` / `nomeEmpresa` | Combinação de listas embutidas, em maiúsculas, sem acento, truncada no tamanho do campo. |
| `valor` | Inteiro em centavos entre 100 e 5.000.000, com os decimais do campo (BigInt; sem float). |
| `dataFutura` / `dataPassada` | DDMMAAAA válido em `today` + 1..60 dias / `today` − 1..30 dias. |
| `hora` | HHMMSS válido. |
| `codigoBarras44` | 44 dígitos com DV geral módulo 11 na pos. 5 do código (padrão FEBRABAN de boletos), sem vínculo com bancos reais. |
| `pixKey` | Chave aleatória (EVP, 36 caracteres) iniciada por letra, cortada ou completada no tamanho do campo, com tipo de chave coerente (G103). |
| `endereco` / `cidade` / `cep` / `uf` | Listas embutidas; CEP com 5 + 3 dígitos; UF válida. |
| `documento` | Identificador único no arquivo: prefixo + contador + sufixo aleatório. |
| `ocorrenciaRetorno` | "00" seguido de brancos (retorno). Na remessa, use `{ "remessa": "blank", "retorno": "ocorrenciaRetorno" }`. |

## Worker

```ts
// src/workers/generation-runner.ts (testável) + generation.worker.ts (cola)
type GenIn = { type: "generate"; jobId: number; config: GenerationConfig; seed: number; today: string /* ISO */ };
type GenOut =
  | { type: "done"; jobId: number; text: string; lines: number }
  | { type: "error"; jobId: number; message: string };
```

Só o job mais recente vale: se chegar um resultado de job antigo, ele é descartado.
