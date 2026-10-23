# Data Model: Gerador de Massa de Testes CNAB 240

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Os tipos existentes (`LayoutDefinition`, `RecordDefinition`, `FieldDefinition`, `CnabDocument`) estão em [src/core/types.ts](../../src/core/types.ts) e em [../001-cnab240-editor/data-model.md](../001-cnab240-editor/data-model.md). Este documento descreve só o que a feature acrescenta.

## 1. Metadados de geração (dado estático do layout)

Arquivo `src/layouts/<layout>/generation.json`, validado por [contracts/generation-metadata.schema.json](contracts/generation-metadata.schema.json). Ele é anexado como `LayoutDefinition.generation?: GenerationMeta`.

### GenerationMeta

| Campo | Tipo | Regra |
|---|---|---|
| `bankFieldId` | string | Id do campo "Código do Banco na Compensação" presente em todas as definições (`codigoBanco`). Teste de integridade: existe em 100% dos registros. |
| `groups` | `GroupMeta[]` | Ordem de exibição na modal e ordem dos lotes no arquivo. |
| `company` | `CompanyMeta` | Quais campos são dados da empresa (G8). |
| `strategies` | `Record<string, StrategyRef>` | Nota FEBRABAN → estratégia de valor (G4). Chave = `FieldDefinition.reference`. |
| `fieldStrategies` | `Record<string, StrategyRef>` (opcional) | Exceções por `recordId.fieldId`, com precedência sobre `strategies`. |
| `excluded` | `{ id: string; reason: string }[]` (opcional) | Definições de detalhe do layout que não são oferecidas na modal (FR-003), cada uma com o motivo (ex.: variação só lida pelo parser, sem forma de gerar linha que resolva para ela). Um id não pode estar ao mesmo tempo em `excluded` e numa variação. |

### GroupMeta (um serviço = um Header de Lote)

| Campo | Tipo | Regra |
|---|---|---|
| `header` | string | Id da `RecordDefinition` de Header de Lote; único entre os grupos. |
| `variants` | `VariantMeta[]` | Ao menos 1. |

**Nome exibido do grupo**: o `title` do Header de Lote sem o prefixo "Header de Lote – ". É o nome oficial do serviço no manual, como transcrito no layout (ex.: "Pagamentos (Títulos de Cobrança e QR Code Pix)", "Cobrança", "Débito em Conta Corrente"). Não é repetido no `generation.json`.

### VariantMeta (uma opção de checkbox)

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | Id da `RecordDefinition` de detalhe (ex.: `segmento-n-darf-pagamento`). Único no arquivo; precisa existir no layout com `kind = "detail"`. |
| `directions` | `("remessa" \| "retorno")[]` | Não vazio (G10). |
| `requires` | string ou `{ remessa, retorno }`? | Id de outra variação do mesmo grupo: o principal (FR-011), que pode variar com a direção. Sem ciclos; o principal não tem `requires` e existe na mesma direção. |
| `batch.values` | `Record<string, string ou { remessa, retorno }>` | Valor por id de campo do Header de Lote do grupo (ex.: `tipoOperacao: "C"`, `tipoServico: "20"`, `formaLancamento: "01"`, `versaoLayoutLote: "046"`). Precisa satisfazer o `match` do header e as regras `batch` da variação. |
| `batch.initial` / `batch.final` | string[]? | Ids de registros tipo 2/4 incluídos em todo lote com esta chave. |
| `fixed` | `Record<string, string>`? | Valores fixos por id de campo do detalhe, quando o `match` não basta (ex.: tipo de tributo do N). |

**Nome exibido da variação**: o `title` da `RecordDefinition` sem o prefixo "Detalhe – " (ex.: "Segmento A", "Segmento N (DARF)", "Segmento A (Débito em Conta Corrente)"). É o nome oficial do manual transcrito no layout; um teste de integridade exige nomes únicos dentro de cada grupo.

**Chave de lote** = `header` do grupo + `batch.values` serializados em ordem de chave. Variações com a mesma chave compartilham o lote (FR-016).

### CompanyMeta

| Campo | Tipo | Regra |
|---|---|---|
| `kinds` | `RecordKind[]` | Nesses tipos de registro, todo campo com nota G005, G006, G007, G008, G009, G010, G011, G012 ou G013 é da empresa. Valor inicial: `["fileHeader", "batchHeader"]`. |
| `records` | `Record<string, string[]>` | Id de definição → ids de campo da empresa. Valor inicial: `segmento-e-conciliacao`, `segmento-h-consignacao`, `segmento-p-cobranca`, `segmento-t-cobranca`, `segmento-y-50-cobranca`, `trailer-lote-conciliacao`, `trailer-lote-gestao-caixa`, com os campos de agência, DV, conta, DV e DV ag/conta. |

### StrategyRef

`string` (nome da estratégia) ou `{ "remessa": string, "retorno": string }` (por direção). Os nomes estão em [contracts/core-api.md › Estratégias](contracts/core-api.md#estratégias). Um nome desconhecido falha no teste de integridade.

## 2. Configuração de geração (runtime, vinda da modal)

### GenerationConfig

| Campo | Tipo | Regra (spec) |
|---|---|---|
| `direction` | `"remessa" \| "retorno"` | Padrão `remessa` (FR-002). |
| `selections` | `Selection[]` | ≥ 1 (FR-005). |
| `bankCode` | string? | Exatamente 3 dígitos quando presente (FR-007). |
| `companyAccount` | `CompanyAccountInput` | Todos os campos opcionais (FR-008). |

### Selection

| Campo | Tipo | Regra |
|---|---|---|
| `variantId` | string | Variação existente e válida para `direction`. |
| `quantity` | number | Inteiro 1–10.000; preenchido com 10 ao marcar; esvaziado na UI ⇒ 10 (FR-006). |
| `auto` | boolean | `true` quando incluída automaticamente como principal (FR-011/FR-012). |

### CompanyAccountInput

| Campo | Tamanho / tipo | Origem do limite |
|---|---|---|
| `agencia` | dígitos, ≤ tamanho do campo `agencia` do Header de Arquivo (5) | Lido da definição. |
| `digitoAgencia` | 1 caractere alfanumérico | Idem. |
| `conta` | dígitos, ≤ 12 | Idem. |
| `digitoConta` | 1 caractere alfanumérico | Idem. |
| `digitoAgenciaConta` | 1 caractere alfanumérico | Idem. |

Valores mais curtos que o campo são completados como o editor completa (`padValue`: zeros à esquerda / espaços à direita), porque é uma ação explícita do usuário (Princípio III).

### Estados da modal

```text
fechada ──abrir──▶ editando ──Gerar (válido)──▶ [conteúdo no quadro?]
                     ▲   │                         ├─ não ─▶ gerando
                     │   └─fechar/Esc─▶ fechada    └─ sim ─▶ confirmando
                     │                                         ├─ cancelar ─▶ editando (escolhas mantidas)
                     │                                         └─ substituir ─▶ gerando
                     └──────── falha (toast de erro) ◀── gerando ──sucesso──▶ fechada (+ toast)
```

Regras de derivação em `editando`:
- **Gerar habilitado** quando há ≥ 1 seleção, nenhum campo inválido e linhas estimadas ≤ limite.
- **Ao marcar uma variação**: a quantidade é preenchida com 10.
- **Ao marcar um dependente**: o principal recebe `auto = true` e a mensagem "<nome do principal> foi incluído porque <nome do dependente> depende dele" (ex.: "Segmento P foi incluído porque Segmento Q depende dele").
- **Ao alterar qualquer quantidade, do principal ou de um dependente**: `quantity(principal) = max(quantity(principal), quantity(dependentes))`. Quando o valor é ajustado, o aviso é:
  - "Quantidade de <principal> ajustada para N para acompanhar <dependente>", quando o dependente subiu;
  - "<principal> não pode ter menos registros que <dependente>: mantido em N", quando o principal foi reduzido.
- **Ao trocar a direção**: seleções inválidas para a nova direção são removidas, com um aviso listando as variações removidas por serviço (ex.: "Removidos por não existirem em Retorno: Cobrança: Segmento P, Segmento Q").

## 3. Catálogo inicial de variações

> Conferido contra o manual v10.11 durante a implementação. Ajustes em relação à tabela abaixo:
> - J-53 existe só na remessa.
> - Y-01, Y-04 e Y-50 a Y-53 da Cobrança existem nas duas direções (principal P na remessa, T no retorno).
> - Y-05 existe só no retorno; Y-02 nas duas.
> - No Vendor, L é só remessa; M e N são só retorno.
> - As versões de lote foram corrigidas.
>
> A fonte de verdade é `generation.json`, e as decisões estão em COVERAGE.md › Gerador de massa.

A tabela abaixo é o conteúdo previsto de `generation.json`. Durante a implementação, cada linha é conferida com o manual e coberta pelo teste de propriedade (research G11). Os nomes são os títulos oficiais transcritos no layout: o do Header de Lote para o serviço e o da definição de detalhe para o segmento.

Na coluna Direções, R = remessa e Ret = retorno.

| Serviço (Header de Lote) | Segmento | Id | Direções | Requer | Forma de lançamento |
|---|---|---|---|---|---|
| Pagamentos (Crédito em Conta, Cheque, OP, DOC, TED, PIX ou Pagamento com Autenticação) | Segmento A | segmento-a-pagamento | R, Ret | — | 01 |
| ″ | Segmento B | segmento-b-pagamento | R, Ret | Segmento A | 01 |
| ″ | Segmento C | segmento-c-pagamento | R, Ret | Segmento A | 01 |
| ″ | Segmento Z | segmento-z-pagamento | Ret | Segmento A | 01 |
| Pagamentos (Títulos de Cobrança e QR Code Pix) | Segmento J | segmento-j-pagamento | R, Ret | — | 31 |
| ″ | Segmento J-52 | segmento-j-52-pagamento | R, Ret | Segmento J | 31 |
| ″ | Segmento J-52 Pix | segmento-j-52-pix-pagamento | R, Ret | Segmento J | 47 |
| ″ | Segmento J-53 | segmento-j-53-pagamento | R, Ret | Segmento J | 31 |
| Pagamentos (Tributos e Contas) | Segmento O | segmento-o-pagamento | R, Ret | — | 11 |
| ″ | Segmento W | segmento-w-pagamento | R, Ret | Segmento O | 11 |
| ″ | Segmento W (W1 – FGTS) | segmento-w-fgts-pagamento | R, Ret | Segmento O | 11 |
| ″ | Segmento N | segmento-n-pagamento | R, Ret | — | 16 |
| ″ | Segmento N (GPS) | segmento-n-gps-pagamento | R, Ret | — | 17 |
| ″ | Segmento N (DARF) | segmento-n-darf-pagamento | R, Ret | — | 16 |
| ″ | Segmento N (DARF Simples) | segmento-n-darf-simples-pagamento | R, Ret | — | 18 |
| ″ | Segmento N (GARE-SP ICMS/DR/ITCMD) | segmento-n-gare-sp-pagamento | R, Ret | — | 22 |
| ″ | Segmento N (IPVA) | segmento-n-ipva-pagamento | R, Ret | — | 25 |
| ″ | Segmento N (DPVAT) | segmento-n-dpvat-pagamento | R, Ret | — | 27 |
| ″ | Segmento N (Licenciamento) | segmento-n-licenciamento-pagamento | R, Ret | — | 26 |
| Cobrança | Segmento P | segmento-p-cobranca | R | — | — |
| ″ | Segmento Q | segmento-q-cobranca | R | Segmento P | — |
| ″ | Segmento R | segmento-r-cobranca | R | Segmento P | — |
| ″ | Segmento S (Tipo de Impressão 1 ou 2) | segmento-s-cobranca | R | Segmento P | — |
| ″ | Segmento S (Tipo de Impressão 3) | segmento-s-3-cobranca | R | Segmento P | — |
| ″ | Segmento Y-01, Y-04, Y-05, Y-50, Y-51, Y-52, Y-53 | segmento-y-NN-cobranca | R (Y-04/Y-05: a confirmar) | Segmento P | — |
| ″ | Segmento T | segmento-t-cobranca | Ret | — | — |
| ″ | Segmento U | segmento-u-cobranca | Ret | Segmento T | — |
| Boleto de Pagamento Eletrônico | Segmento G | segmento-g-boleto-eletronico | Ret | — | — |
| ″ | Segmento H | segmento-h-boleto-eletronico | Ret | Segmento G | — |
| ″ | Segmento Y-03, Y-51, Y-52, Y-53 | segmento-y-NN-boleto-eletronico | Ret | Segmento G | — |
| Alegação do Pagador | Segmento Y-02 | segmento-y-02-alegacao-pagador | R | — | — |
| Débito em Conta Corrente | Segmento A (Débito em Conta Corrente) | segmento-a-debito | R, Ret | — | — |
| ″ | Segmento B / C (Débito em Conta Corrente) | segmento-b-debito / segmento-c-debito | R, Ret | Segmento A (Débito em Conta Corrente) | — |
| Extrato de Conta Corrente para Conciliação Bancária | Segmento E (Extrato para Conciliação Bancária) | segmento-e-conciliacao | Ret | — | — |
| Extrato para Gestão de Caixa | Segmento F / Segmento I (Extrato para Gestão de Caixa) | segmento-f-gestao-caixa / segmento-i-gestao-caixa | Ret | — | — (+ saldo inicial/final) |
| Custódia de Cheques | Segmento D (Custódia de Cheques) | segmento-d-custodia | R, Ret | — | — |
| Empréstimo por Consignação/Retenção | Segmento H (Empréstimo por Consignação/Retenção) | segmento-h-consignacao | R, Ret | — | — |
| Vendor | Segmento K / L / M / N (Vendor) | segmento-k/l/m/n-vendor | R, Ret | L, M, N → Segmento K (Vendor) | — |
| Compror / Compror Rotativo | Segmento A / B / C / I / I-11 / J (Compror) | segmento-*-compror | R, Ret | B, C, I, I-11, J → Segmento A (Compror) | — |

## 4. Saída

### GenerationPlan (antes de gerar; alimenta a estimativa)

| Campo | Tipo |
|---|---|
| `batches` | `{ key, header, trailer, values, initial[], final[], sets: { principal, dependents[] }[] }[]`; `trailer` é o Trailer de Lote que aceita os valores do header. Um lote que passa da capacidade do campo `countRecords` do trailer é dividido em vários (research G13). |
| `estimatedLines` | number = 2 + Σ por lote, já dividido (2 + \|initial\| + \|final\| + Σ conjuntos (1 + \|dependentes\|)) |
| `maxLines` | number = 10^(tamanho do campo `countRecords` do Trailer de Arquivo) − 1 |

### GenerationResult

| Campo | Tipo | Regra |
|---|---|---|
| `text` | string | Registros separados por CRLF, com CRLF final; cada um com `layout.recordLength` caracteres, apenas charset ISO-8859-1. |
| `lines` | number | = `estimatedLines`. |

Na UI, o texto vira um `CnabDocument` via `fromPastedText` (`origin = "paste"`), com `hasUnexportedChanges = true` (research G12).

## 5. Invariantes verificadas por teste

1. Toda linha gerada resolve (`matchRecord` com o contexto do lote) para a definição planejada.
2. `validateRecord` + `validateStructure` + `validateTotals` ⇒ 0 erros (SC-001).
3. O campo `bankFieldId` de todas as linhas = `bankCode` quando informado; senão, é um único valor no arquivo (FR-024, FR-027).
4. Os campos da empresa (CompanyMeta) = `companyAccount` quando informado; senão, são um único perfil no arquivo (FR-021, FR-025, FR-027).
5. Campos de conta de terceiros não são afetados por `companyAccount` (FR-026).
6. CPF/CNPJ gerados têm DV válido, e não há dois detalhes consecutivos com os mesmos dados variáveis (SC-006).
