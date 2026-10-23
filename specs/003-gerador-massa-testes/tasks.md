---

description: "Lista de tarefas para implementar o Gerador de Massa de Testes CNAB 240"
---

# Tasks: Gerador de Massa de Testes CNAB 240

**Input**: Documentos de design em `/specs/003-gerador-massa-testes/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: OBRIGATÓRIOS. A constituição (Princípio IV, NON-NEGOTIABLE) exige TDD com golden files. Em cada fase, escreva os testes primeiro e confirme que falham antes de implementar.

**Organization**: as tarefas estão agrupadas por história de usuário, para que cada uma possa ser implementada e testada de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta).
- **[Story]**: história a que a tarefa pertence (US1…US5, conforme spec.md).
- Os caminhos são relativos à raiz do repositório (projeto único client-only, ver plan.md, "Project Structure").

## Regras transversais (valem para TODAS as tarefas)

- **Nenhuma posição de campo no código do gerador** (Princípio I).
  - `src/core/generate/` só lê `start`, `end`, `size`, `type`, `decimals`, `domain`, `reference`, `match` e `totals` das definições, e o `generation.json`.
  - Ids de registro e de campo só aparecem em `src/layouts/**/generation.json` e nos testes.
- **Dinheiro**: valores e somas só como string de dígitos ou `BigInt`; ponto flutuante é proibido (Princípio II).
- **Aleatoriedade**: só pelo PRNG de `src/core/generate/rng.ts`. `Math.random` é proibido no gerador, para que testes com `seed` e `today` fixos sejam reprodutíveis (research G5).
- **Texto alfanumérico gerado**: apenas maiúsculas sem acento, dígitos, espaço e a pontuação aceita por `FEBRABAN_CHAR` em `src/core/validate/field.ts` (FR-022).
- **Dados fictícios**: nenhum dado real de pessoa ou empresa, nem nos golden files (Princípio V).
- **Interface**: textos em pt-BR e `data-testid` exatamente como em [contracts/ui-contract.md](contracts/ui-contract.md).
- **API**: assinaturas exatamente como em [contracts/core-api.md](contracts/core-api.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: preparar branch, tipos e carregamento dos metadados de geração.

- [X] T001 Criar a branch `003-gerador-massa-testes` a partir de `002-visual-refresh` e commitar a pasta `specs/003-gerador-massa-testes/` (spec, plan, research, data-model, contracts, quickstart, checklists, tasks)
- [X] T002 Adicionar os tipos de [data-model.md](data-model.md) §1 e §2 em src/core/types.ts:
  - `GenerationMeta`, `GroupMeta`, `VariantMeta`, `CompanyMeta`, `StrategyName`, `StrategyRef`, `GenerationConfig`, `Selection`, `CompanyAccountInput`, `GenerationPlan`, `GenerationResult`;
  - propriedade opcional `generation?: GenerationMeta` em `LayoutDefinition`;
  - `StrategyName` com exatamente os nomes do enum `strategyName` de [contracts/generation-metadata.schema.json](contracts/generation-metadata.schema.json).
- [X] T003 [P] Alterar `recordFiles` em src/layouts/node-loader.ts e o filtro de `fromGlob` em src/layouts/loader.ts para excluir `generation.json` das definições de registro, e passá-lo como 3º argumento opcional de `assembleLayout`
- [X] T004 Alterar `assembleLayout(meta, records, generation?)` em src/layouts/assemble.ts para anexar `generation` à `LayoutDefinition` só quando fornecido (depende de T002, T003)
- [X] T005 [P] Estender scripts/validate-layout.ts para validar `generation.json`, quando existir na pasta do layout, contra `specs/003-gerador-massa-testes/contracts/generation-metadata.schema.json`, e excluir `generation` do objeto validado pelo schema de layout da 001

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: PRNG, estratégias de valor e metadados, que todas as histórias usam.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

### Testes (escrever primeiro, devem falhar)

- [X] T006 [P] Escrever tests/unit/generate/rng.test.ts:
  - mulberry32 com a mesma semente produz a mesma sequência;
  - `int(min, max)` respeita os limites inclusivos;
  - `pick` cobre todos os itens em 1.000 sorteios;
  - `digits(n)` devolve n dígitos.
- [X] T007 [P] Escrever tests/unit/generate/strategies.test.ts, cobrindo cada estratégia de [contracts/core-api.md › Estratégias](contracts/core-api.md#estratégias):
  - CPF (11) e CNPJ (14) com DV válido, verificados por função de DV independente escrita no próprio teste;
  - `codigoBarras44` com DV módulo 11 correto na 5ª posição;
  - `pixKey` nunca começa por 0/1/2/3/9;
  - `valor` entre 100 e 5.000.000 centavos, com os decimais do campo;
  - `dataFutura` em hoje+1..60 e `dataPassada` em hoje−30..−1, sempre DDMMAAAA válida;
  - `hora` HHMMSS válida;
  - nomes, endereços e cidades só com `FEBRABAN_CHAR` e no tamanho do campo;
  - `cep` com 5 + 3 dígitos e `uf` sempre uma das 27 siglas válidas (FR-020);
  - `documento` único em 10.000 chamadas;
  - `blank` (A espaços, numéricos zeros);
  - `ocorrenciaRetorno` = "00" + brancos.
- [X] T008 [P] Escrever tests/unit/generate/generation-integrity.test.ts sobre o layout carregado por `loadLayoutFromDir`:
  - todo `group.header` (kind = `batchHeader`), `variant.id`, `batch.initial[]`, `batch.final[]`, chave de `company.records` e id de campo citado existe no layout;
  - todo `variant.id` é `kind = "detail"`;
  - `requires` aponta para variação do mesmo grupo, sem `requires` próprio;
  - toda definição tem o campo `bankFieldId`;
  - todo campo de detalhe ou trailer de lote chamado "Agência Mantenedora da Conta" está em `company.records`;
  - nenhum campo com nome contendo "Favor", "Pagador" ou "Benef" está em `company.records`;
  - toda chave de `strategies` é uma nota existente no layout;
  - os nomes exibidos (títulos sem "Detalhe – ") são únicos dentro de cada grupo;
  - toda definição de detalhe do layout aparece como variação ou em `excluded` do `generation.json`, com `reason` preenchido; nenhum id aparece nos dois.

### Implementação

- [X] T009 [P] Implementar src/core/generate/rng.ts: `createRng(seed: number)` (mulberry32) com `next()`, `int(min, max)`, `pick<T>(items)` e `digits(n)` (faz T006 passar)
- [X] T010 [P] Implementar src/core/generate/strategies.ts (faz T007 passar):
  - um mapa `StrategyName → (ctx) => string`, em que `ctx = { field: FieldDefinition, rng, today: Date, direction, record: Record<string, string> /* valores já gerados no registro, por id */, counter: () => number }`;
  - o resultado é sempre do tamanho exato do campo (usar `padValue` de src/core/validate/field.ts);
  - `inscricao` lê o tipo no campo irmão de nota G005 do mesmo registro: "1" gera CPF, "2" gera CNPJ; se o tipo ainda não foi gerado, sorteia 1/2 e grava;
  - listas de nomes, ruas, cidades e UFs embutidas no próprio arquivo, em maiúsculas e sem acento.
- [X] T011 Criar src/layouts/febraban-cnab240-v10.11/generation.json conforme [data-model.md](data-model.md) §1 e §3:
  - `bankFieldId: "codigoBanco"`;
  - `company.kinds: ["fileHeader","batchHeader"]`;
  - `company.records` com os campos de agência, DV agência, conta, DV conta e DV ag/conta de `segmento-e-conciliacao`, `segmento-h-consignacao`, `segmento-p-cobranca`, `segmento-t-cobranca`, `segmento-y-50-cobranca`, `trailer-lote-conciliacao` e `trailer-lote-gestao-caixa` (ids conferidos nos JSON);
  - `strategies` por nota, conforme research G4;
  - todos os grupos e variações da tabela §3, com `batch.values` (`tipoOperacao`, `tipoServico`, `formaLancamento` quando o header tiver, `versaoLayoutLote`) conferidos contra o manual v10.11 e o `match` de cada header;
  - `fixed` onde o `match` não basta;
  - `excluded` com `id` e `reason` para cada detalhe do layout que não puder ser gerado (FR-003).

  Rodar `npm run validate:layout` e T008 até ficarem verdes (depende de T004, T005).

**Checkpoint**: estratégias e metadados verdes; as histórias podem começar.

---

## Phase 3: User Story 1 - Gerar uma massa de testes com os segmentos escolhidos (Priority: P1) 🎯 MVP

**Goal**: botão no cabeçalho e na tela vazia, modal com a lista de segmentos (remessa) e quantidade por segmento, e geração de um arquivo completo e válido carregado no quadro principal.

**Independent Test**: abrir a modal, marcar "Segmento A" (serviço "Pagamentos (Crédito em Conta, Cheque, OP, DOC, TED, PIX ou Pagamento com Autenticação)") e "Segmento J" (serviço "Pagamentos (Títulos de Cobrança e QR Code Pix)"), gerar e verificar:
- 1 HA, 2 lotes com 10 detalhes cada e 1 TA;
- 0 erros no contador;
- toast com o total de linhas.

### Testes (escrever primeiro, devem falhar)

- [X] T012 [P] [US1] Escrever tests/unit/generate/catalog.test.ts: `buildCatalog(layout, "remessa")` devolve um grupo por Header de Lote e as variações na ordem do `generation.json`, com `label` = `title` da definição sem "Header de Lote – " (grupo) ou sem "Detalhe – " (variação), ex.: "Pagamentos (Títulos de Cobrança e QR Code Pix)" e "Segmento J-52 Pix"; só com variações cuja `directions` inclui a direção, com `dependents` calculado; layout sem `generation` devolve `[]`
- [X] T013 [P] [US1] Escrever tests/unit/generate/plan.test.ts:
  - A + J geram 2 lotes;
  - N–DARF + O geram 2 lotes (formas 16 e 11, FR-016);
  - duas variações com a mesma chave de lote geram 1 lote;
  - `estimatedLines` = 2 + Σ(2 + |initial| + |final| + Σ conjuntos);
  - `maxLines` = 10^tamanho do campo `countRecords` do Trailer de Arquivo − 1 (= 999.999);
  - dependente com quantidade menor que o principal: só os primeiros conjuntos levam o dependente (FR-014);
  - dependente selecionado sem o principal: o principal entra no plano com a quantidade do dependente.
- [X] T014 [P] [US1] Escrever tests/unit/generate/build.test.ts, com `seed = 42` e `today = 2026-10-22`:
  - cada linha tem 240 caracteres;
  - CRLF entre registros e CRLF final;
  - mesma entrada gera saída idêntica;
  - `fromPastedText` + `resolveRecords` resolvem cada linha para a definição planejada;
  - G002/G038 sequenciais corretos;
  - Código Remessa/Retorno = "1";
  - dados da empresa (inscrição, nome, convênio, agência, conta) e `codigoBanco` iguais em todo o arquivo (FR-021, FR-027);
  - nenhum par de detalhes consecutivos com os mesmos nome, documento e valor (SC-006).
- [X] T015 [P] [US1] Escrever tests/unit/generate/generate-all-variants.test.ts (SC-001):
  - para cada variação com `remessa` em `directions`, 3 sementes, quantidade 3;
  - `validateRecord` em toda linha + `validateStructure` + `validateTotals` ⇒ 0 erros;
  - a mensagem de falha cita a variação, a linha e o erro.
- [X] T016 [P] [US1] Escrever tests/unit/generation-runner.test.ts:
  - "generate" devolve `done` com `text` e `lines`;
  - um job novo descarta o resultado do anterior;
  - `GenerationError` vira `{ type: "error", message }`.
- [X] T017 [P] [US1] Escrever tests/component/GeneratorDialog.test.tsx (US1-1, US1-2, FR-002, FR-005, FR-006, FR-010, FR-030):
  - abre com o grupo de rádio de direção, `generator-direction-remessa` marcado (nesta fase `generator-direction-retorno` aparece desabilitado; é habilitado na US4);
  - abre com nada marcado e os campos de banco e conta vazios;
  - `generator-confirm` desabilitado e `generator-form-error` = "Marque ao menos um segmento";
  - marcar uma variação habilita `generator-qty-<id>` preenchido com `10` e habilita Gerar; esvaziar o campo mantém o padrão 10 na estimativa;
  - quantidade `0`, `10001`, `1.5` ou `abc` mostra "Informe um número inteiro de 1 a 10.000" e desabilita Gerar;
  - `generator-estimate` atualiza o total;
  - acima de 100.000 aparece `generator-warning`;
  - acima de 999.999 aparece `generator-limit` e Gerar fica desabilitado;
  - falha na geração (worker simulado devolvendo `{ type: "error" }`): a modal continua aberta com as escolhas, o documento do quadro principal não muda e aparece o toast `error` "Massa de testes não gerada: <motivo>" (FR-030, edge case "falha inesperada").
- [X] T018 [P] [US1] Escrever tests/component/Header.generate.test.tsx: o botão `generate` aparece após `paste` e antes do divisor do tema, com o texto "Gerar massa de testes"; `generate-empty` aparece só com o quadro vazio; ambos abrem `generator-dialog`
- [X] T019 [P] [US1] Escrever tests/e2e/generator.spec.ts, cenários US1-3, US1-4, US1-5, US1-7:
  - gerar A + J;
  - conferir 26 linhas (HA + 2 × (HL + 10 detalhes + TL) + TA), rótulos `HA`, `HL`, `A`…, `TL`, `TA`;
  - contador de erros em 0;
  - indicador "Remessa";
  - toast "Massa de testes gerada: 26 linhas";
  - modal fechada e linha 1 selecionada;
  - falha simulada (substituir o construtor `Worker` por um falso que responde `{ type: "error" }`, via `page.addInitScript`): modal aberta, quadro inalterado e toast de erro (FR-030).

### Implementação

- [X] T020 [P] [US1] Implementar `buildCatalog` em src/core/generate/catalog.ts (faz T012 passar)
- [X] T021 [US1] Implementar `planGeneration` em src/core/generate/plan.ts, conforme data-model §4 e research G3/G6 (faz T013 passar; depende de T020)
- [X] T022 [US1] Implementar `generateMassa` em src/core/generate/build.ts (faz T014 e T015 passarem; depende de T010, T021). Etapas, nesta ordem:
  1. Sortear o perfil da empresa (inscrição com DV, nome, convênio, agência, conta, DVs, código do banco).
  2. Para cada registro: preencher pelas regras `match` (`equals` grava; `in` usa o 1º valor).
  3. Aplicar `batch.values` no header e `fixed` no detalhe.
  4. Aplicar o perfil da empresa nos campos de `company`, e `codigoBanco` em `bankFieldId`.
  5. Preencher os campos de controle (G002, G038, G015 pela direção, G016/G017 por `today`).
  6. Aplicar as estratégias (`fieldStrategies` > `strategies`).
  7. Usar domínio para os campos com `domain`.
  8. Aplicar o padrão por tipo (obrigatório aleatório; opcional vazio; G004 sempre branco).
  9. Montar o texto com CRLF.
  10. Criar o documento via `fromPastedText` e aplicar `recalculateTotals`.
  11. Conferir com `matchRecord` que cada linha resolve para a definição planejada; se não, lançar `GenerationError` citando a variação.
- [X] T023 [P] [US1] Implementar src/workers/generation-runner.ts e src/workers/generation.worker.ts, com as mensagens `GenIn`/`GenOut` de [contracts/core-api.md › Worker](contracts/core-api.md#worker), seguindo o padrão de src/workers/validation.worker.ts (faz T016 passar)
- [X] T024 [P] [US1] Adicionar o ícone `wand` em src/ui/components/Icon.tsx, no mesmo estilo de traço dos ícones existentes
- [X] T025 [US1] Implementar `validateConfig` (só regras de quantidade, seleção mínima, estimativa e limite nesta fase) e um `toggleVariant` simples, sem dependências, em src/core/generate/selection.ts, conforme a tabela de [contracts/core-api.md › Validação](contracts/core-api.md#validação-da-configuração) (depende de T021)
- [X] T026 [US1] Implementar src/ui/state/generator.ts (depende de T023, T025):
  - signals `generatorOpen`, `direction` (fixo em "remessa" nesta fase), `selections`, `bankCode`, `companyAccount`, `issues` (via `validateConfig`), `running`;
  - `openGenerator()` com valores padrão;
  - `runGeneration()`:
    - envia ao worker com `seed` de `crypto.getRandomValues` e `today = new Date()`;
    - no `done`: `fromPastedText`, `hasUnexportedChanges = true`, carregar pelo fluxo de `replaceOrConfirm` de src/ui/state/document.ts, fechar a modal e mostrar o toast "Massa de testes gerada: N linhas";
    - no `error`: manter a modal e mostrar o toast "Massa de testes não gerada: <motivo>" (FR-030).
- [X] T027 [US1] Implementar src/ui/components/dialogs/GeneratorDialog.tsx conforme [contracts/ui-contract.md](contracts/ui-contract.md) itens 2, 5 e 6 (faz T017 passar; depende de T025, T026):
  - `<Dialog wide testId="generator-dialog" title="Gerar massa de testes">`;
  - grupo de rádio de direção (item 1 do ui-contract) com Remessa marcado e Retorno desabilitado nesta fase;
  - um fieldset por grupo, checkbox e quantidade;
  - resumo, aviso e limite;
  - mensagens de campo com `aria-invalid` e `aria-describedby`;
  - Gerar com "Gerando…" e `aria-busy` durante a execução;
  - Enter gera quando habilitado;
  - estilos em src/ui/styles/app.css, usando os tokens existentes de src/ui/styles/tokens.css.
- [X] T028 [US1] Adicionar o botão `generate` em src/ui/components/Header.tsx (após "Colar conteúdo", antes do divisor; sempre visível) e `generate-empty` como 3º botão de `.empty-actions` em src/ui/components/MainPane.tsx; texto da tela vazia: "Importe um arquivo CNAB 240 (.rem, .ret ou .txt), cole o conteúdo ou gere uma massa de testes.", conforme [contracts/ui-contract.md](contracts/ui-contract.md) (faz T018 passar). Hoje nenhum teste da 001 confere esse texto (verificado por busca); conferir de novo com `npm test` e `npm run test:e2e` após a mudança.
- [X] T029 [US1] Registrar `<GeneratorDialog />` em src/ui/App.tsx e rodar T019 até ficar verde

**Checkpoint**: US1 funciona sozinha. Gerar A + J sem erros e `npm test` verde.

---

## Phase 4: User Story 2 - Fixar banco e conta da empresa em todo o arquivo (Priority: P1)

**Goal**: os campos Código do Banco na Compensação e agência/conta da empresa, aplicados em todos os registros previstos.

**Independent Test**: gerar com banco `033`, agência `1234` e conta `56789`, marcando "Segmento A" (Pagamentos – Crédito em Conta…) e "Segmento P" (Cobrança). Conferir:
- `033` nas pos. 1–3 de todas as linhas;
- agência e conta nos headers e em cada P;
- conta do favorecido em A variada.

### Testes (escrever primeiro, devem falhar)

- [X] T030 [P] [US2] Escrever tests/unit/generate/company.test.ts (FR-024–FR-027, data-model §5 invariantes 3–5):
  - com `bankCode: "033"`, o campo `codigoBanco` = "033" em todas as linhas, e os campos de banco de terceiros (`segmento-k-vendor.bancoDebito`, `segmento-r-cobranca.bancoDebito`, `segmento-y-50-cobranca.bancoBeneficiario`, banco do favorecido em A) ≠ forçados;
  - com `companyAccount` completo, os valores aparecem com `padValue` em todo campo de `company.kinds`/`company.records` (HA, HL, P, E, T, Y-50, trailers de conciliação e gestão de caixa);
  - agência/conta do favorecido (A), pagador (A–débito) e beneficiário variam entre detalhes;
  - preenchimento parcial (só agência) aplica a agência e gera o resto do perfil.
- [X] T031 [P] [US2] Estender tests/component/GeneratorDialog.test.tsx (US2-5, US2-6):
  - `generator-bank` com `33` ou `AB1`: "Informe exatamente 3 dígitos", `aria-invalid` e Gerar desabilitado;
  - esvaziar o campo remove o erro;
  - `generator-agencia` com 6 dígitos ou letra: "Use apenas dígitos, até 5";
  - `generator-conta` com 13 dígitos: "Use apenas dígitos, até 12";
  - os limites são lidos do Header de Arquivo.
- [X] T032 [P] [US2] Adicionar cenário em tests/e2e/generator.spec.ts (US2-1, US2-2a, US2-3): gerar com banco `033`, agência e conta; selecionar linhas HA, HL, P e A e conferir os campos no quadro de edição

### Implementação

- [X] T033 [US2] Estender `generateMassa` em src/core/generate/build.ts: `config.bankCode` e `config.companyAccount` sobrescrevem as partes correspondentes do perfil da empresa antes de aplicá-lo, usando `padValue` com o `FieldDefinition` de destino (faz T030 passar)
- [X] T034 [US2] Estender `validateConfig` em src/core/generate/selection.ts com as regras de `bankCode`, `agencia`, `conta` e DVs. Os limites vêm de `fields` do `fileHeader` (ids pela nota G008/G010), não de constantes.
- [X] T035 [US2] Adicionar o fieldset "Banco e conta da empresa" em src/ui/components/dialogs/GeneratorDialog.tsx, item 4 do ui-contract, com os signals `bankCode`/`companyAccount` em src/ui/state/generator.ts (faz T031 e T032 passarem)

**Checkpoint**: US1 + US2 entregam o MVP de produto (massa válida para o banco e a conta da homologação).

---

## Phase 5: User Story 3 - Segmentos dependentes incluídos com aviso (Priority: P2)

**Goal**: marcar um dependente inclui o principal, com aviso, trava ao desmarcar, ajuste de quantidade e ordem dos conjuntos.

**Independent Test**: marcar só "Segmento Q" (Cobrança) e verificar:
- P marcado com selo e aviso;
- tentar desmarcar P é recusado;
- Q = 8 com P = 5 ajusta P para 8;
- o arquivo sai com conjuntos P+Q.

### Testes (escrever primeiro, devem falhar)

- [X] T036 [P] [US3] Escrever tests/unit/generate/selection.test.ts (FR-011–FR-013, US3-1 a US3-5):
  - `toggleVariant(Q, on)` inclui P com `auto: true` e o aviso exato "Segmento P foi incluído porque Segmento Q depende dele" (nomes vindos dos títulos das definições de layout);
  - `toggleVariant(P, off)` com Q marcado devolve `refused` e mantém P;
  - desmarcar Q remove P com `auto: true`, mas mantém P marcado pelo usuário antes;
  - `setQuantity(Q, "8")` com P = 5 leva P a 8 com o aviso "Quantidade de Segmento P ajustada para 8 para acompanhar Segmento Q";
  - `setQuantity(P, "3")` com Q = 8 mantém P em 8 com o aviso "Segmento P não pode ter menos registros que Segmento Q: mantido em 8" (FR-013, US3-5a);
  - marcar uma variação cria a seleção com `quantity = 10`;
  - marcar A, B e C não duplica A.
- [X] T037 [P] [US3] Estender tests/unit/generate/build.test.ts (US3-4, US3-6): P = 10, Q = 5 gera 10 conjuntos e só os 5 primeiros com Q; A, B, C = 10 geram conjuntos na ordem A, B, C
- [X] T038 [P] [US3] Estender tests/component/GeneratorDialog.test.tsx: selo `generator-auto-<id>` visível; `generator-notices` com o aviso; clicar no checkbox do principal travado mostra o motivo em `generator-notices`

### Implementação

- [X] T039 [US3] Completar `toggleVariant` e `setQuantity` em src/core/generate/selection.ts com as regras de dependência de [contracts/core-api.md › Seleção](contracts/core-api.md#seleção-regras-da-modal-puras-e-testáveis-sem-ui) (faz T036 passar)
- [X] T040 [US3] Garantir em src/core/generate/plan.ts e src/core/generate/build.ts a ordem principal → dependentes, na ordem das variações do grupo, por conjunto (faz T037 passar)
- [X] T041 [US3] Ligar avisos, recusas e selo "incluído automaticamente" em src/ui/state/generator.ts e src/ui/components/dialogs/GeneratorDialog.tsx; `generator-notices` com `role="status"` e `aria-live="polite"` (faz T038 passar). Adicionar cenário US3 em tests/e2e/generator.spec.ts.

**Checkpoint**: dependências seguras na modal e no arquivo.

---

## Phase 6: User Story 4 - Gerar massa de retorno (Priority: P2)

**Goal**: seletor Remessa/Retorno, lista filtrada por direção, e arquivo de retorno válido com ocorrências.

**Independent Test**: escolher Retorno, marcar "Segmento T" (Cobrança), gerar e verificar:
- indicador "Retorno";
- Código Remessa/Retorno = 2;
- 0 erros.

### Testes (escrever primeiro, devem falhar)

- [X] T042 [P] [US4] Estender tests/unit/generate/generate-all-variants.test.ts para a direção `retorno`: toda variação com `retorno` em `directions`, 3 sementes, 0 erros; Código Remessa/Retorno = "2"; campos `ocorrenciaRetorno` = "00" + brancos
- [X] T043 [P] [US4] Estender tests/unit/generate/selection.test.ts: `changeDirection` remove as seleções sem a nova direção, com o aviso listando os rótulos removidos (US4-1)
- [X] T044 [P] [US4] Estender tests/component/GeneratorDialog.test.tsx: rádio `generator-direction-remessa` marcado por padrão; trocar para `generator-direction-retorno` filtra os grupos e variações e mostra o aviso
- [X] T045 [P] [US4] Adicionar cenário US4-2 em tests/e2e/generator.spec.ts: Retorno + T + U, indicador "Retorno", 0 erros

### Implementação

- [X] T046 [US4] Conferir contra o manual v10.11 e corrigir em src/layouts/febraban-cnab240-v10.11/generation.json as `directions` e `strategies` por direção (ex.: G059 `{ "remessa": "blank", "retorno": "ocorrenciaRetorno" }`, códigos de movimento de retorno), até T042 passar. Registrar no COVERAGE.md as decisões que divergirem da tabela de data-model §3.
- [X] T047 [US4] Implementar `changeDirection` em src/core/generate/selection.ts (faz T043 passar)
- [X] T048 [US4] Habilitar a opção Retorno do grupo de rádio de direção (criado na T027) em src/ui/components/dialogs/GeneratorDialog.tsx e tornar `direction` editável em src/ui/state/generator.ts, recalculando o catálogo com `buildCatalog` (faz T044 e T045 passarem)

**Checkpoint**: remessa e retorno cobertos pelo teste de propriedade.

---

## Phase 7: User Story 5 - Proteção do conteúdo atual (Priority: P3)

**Goal**: confirmar sempre que o quadro tiver conteúdo; ao cancelar, voltar à modal com as escolhas mantidas.

**Independent Test**:
- carregar um arquivo (sem editar), gerar e verificar que o diálogo de substituição aparece;
- cancelar mantém a modal e o quadro;
- confirmar substitui.

### Testes (escrever primeiro, devem falhar)

- [X] T049 [P] [US5] Escrever tests/component/GeneratorReplace.test.tsx (US5-1 a US5-4, FR-029):
  - com conteúdo sem alterações, Gerar abre `replace-content-dialog` com o texto "O conteúdo atual do quadro principal será substituído pela massa gerada.";
  - `replace-cancel` mantém `generator-dialog` aberto com as seleções e o quadro intacto;
  - `replace-confirm` carrega a massa;
  - com o quadro vazio, carrega sem perguntar;
  - fechar a modal não muda o quadro.
- [X] T050 [P] [US5] Adicionar cenário US5 em tests/e2e/generator.spec.ts: importar um golden file, gerar, cancelar a substituição, gerar de novo e confirmar

### Implementação

- [X] T051 [US5] Generalizar `replaceOrConfirm` em src/ui/state/document.ts:
  - aceitar `{ always?: boolean; message?: string; onCancel?: () => void }`;
  - guardar `message` e `onCancel` em `pendingReplace`;
  - em src/ui/components/dialogs/ReplaceContentDialog.tsx, exibir `pendingReplace.value.message`, com o texto atual como padrão;
  - `cancelReplace` chama `onCancel`.

  Importação e colagem mantêm o comportamento atual: regressão coberta pelos testes existentes de tests/component e tests/e2e/us1-load.spec.ts.
- [X] T052 [US5] Em src/ui/state/generator.ts, gerar primeiro e chamar `replaceOrConfirm(next, { always: true, message, onCancel })`. Só fechar a modal após a substituição efetiva. Ao cancelar, a modal permanece com as escolhas (faz T049 e T050 passarem).

**Checkpoint**: todas as histórias funcionando de forma independente.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T053 [P] Gerar golden files com semente e data fixas (quantidade 2, várias variações) em tests/golden/febraban-cnab240-v10.11/valid/gerador-remessa.rem e gerador-retorno.ret, com os respectivos `.expected.json`, por um script `scripts/generate-golden-gerador.ts`; registrar em tests/golden/README.md
- [X] T054 [P] Adicionar casos `@perf` em tests/e2e/perf.spec.ts (SC-003):
  - gerar ~10.000 linhas e exigir quadro carregado em ≤ 3 s;
  - gerar ~100.000 linhas e exigir ≤ 15 s;
  - nenhuma long task > 200 ms na thread principal (PerformanceObserver, como nos testes existentes).
- [X] T055 [P] Adicionar a geração ao tests/e2e/privacy.spec.ts: nenhuma requisição de rede durante a geração (FR-032)
- [X] T056 [P] Registrar no src/layouts/febraban-cnab240-v10.11/COVERAGE.md uma seção "Gerador de massa" com a lista de variações, direções, dependências e chaves de lote do generation.json e as fontes no manual
- [X] T057 Rodar o roteiro de [quickstart.md](quickstart.md) (seções 1, 2 e 3) e `npm run lint`, `npm run build`, `npm test`, `npm run test:e2e`; corrigir o que falhar
- [X] T058 Atualizar o checklist em specs/003-gerador-massa-testes/checklists/requirements.md, se a implementação tiver alterado alguma decisão da spec, e registrar a mudança na seção Clarifications da spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências; T004 depende de T002 e T003.
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias. T011 depende de T004 e T005.
- **US1 (Phase 3)**: depende da Foundational.
- **US2 (Phase 4)**: depende de US1, porque estende `build.ts`, `selection.ts` e a modal.
- **US3 (Phase 5)**: depende de US1; é independente de US2.
- **US4 (Phase 6)**: depende de US1; é independente de US2 e US3.
- **US5 (Phase 7)**: depende de US1; é independente das demais.
- **Polish (Phase 8)**: depois das histórias desejadas.

### User Story Dependencies

- **US1 (P1)** é a base: catálogo, plano, geração, worker, modal e botões.
- **US2, US3, US4 e US5** só dependem de US1 e podem ser feitas em qualquer ordem ou em paralelo. Os conflitos de arquivo são em `GeneratorDialog.tsx`, `generator.ts`, `selection.ts` e `build.ts`; coordenar merges.

### Within Each User Story

- Testes primeiro, falhando.
- Núcleo puro (`src/core/generate`) antes do estado de UI, e estado antes dos componentes.
- O E2E da história é o último passo.

### Parallel Opportunities

- **Phase 1**: T003 e T005.
- **Phase 2**: T006, T007 e T008 (testes); depois T009 e T010.
- **US1**: T012–T019 (todos os testes); T020, T023 e T024 em paralelo.
- **US2–US5**: os testes de cada história em paralelo entre si. Com mais de uma pessoa, US3, US4 e US5 em paralelo após US1.

---

## Parallel Example: User Story 1

```bash
# Testes da US1 juntos:
Task: "Escrever tests/unit/generate/catalog.test.ts"
Task: "Escrever tests/unit/generate/plan.test.ts"
Task: "Escrever tests/unit/generate/build.test.ts"
Task: "Escrever tests/unit/generate/generate-all-variants.test.ts"
Task: "Escrever tests/unit/generation-runner.test.ts"
Task: "Escrever tests/component/GeneratorDialog.test.tsx"
Task: "Escrever tests/component/Header.generate.test.tsx"
Task: "Escrever tests/e2e/generator.spec.ts"

# Implementação independente:
Task: "Implementar buildCatalog em src/core/generate/catalog.ts"
Task: "Implementar src/workers/generation-runner.ts e generation.worker.ts"
Task: "Adicionar o ícone wand em src/ui/components/Icon.tsx"
```

## Parallel Example: Foundational

```bash
Task: "Escrever tests/unit/generate/rng.test.ts"
Task: "Escrever tests/unit/generate/strategies.test.ts"
Task: "Escrever tests/unit/generate/generation-integrity.test.ts"
# depois:
Task: "Implementar src/core/generate/rng.ts"
Task: "Implementar src/core/generate/strategies.ts"
```

---

## Implementation Strategy

### MVP First

- **MVP mínimo demonstrável: US1.** Gera remessas válidas de qualquer variação, com banco e conta fictícios.
- **MVP de produto: US1 + US2** (ambas P1). Gera a massa com o banco e a conta da homologação.

Passos:
1. Phase 1 → Phase 2. Parar e validar: `validate:layout` e integridade dos metadados verdes.
2. Phase 3 (US1). Parar e validar: o teste de propriedade com 0 erros em todas as variações de remessa e o E2E de A + J.
3. Phase 4 (US2). Validar o roteiro manual 4 do quickstart.

### Incremental Delivery

1. US1: massa de remessa pelo botão.
2. US2: banco e conta da homologação.
3. US3: dependências seguras.
4. US4: retorno.
5. US5: proteção do conteúdo atual.
6. Polish: golden files, desempenho e privacidade verificados.

### Parallel Team Strategy

1. A equipe conclui Setup e Foundational. Nessa fase, uma pessoa fica em `generation.json` (T011) e outra em `rng` e `strategies`.
2. Após US1: Dev A → US2; Dev B → US3 e US4; Dev C → US5 e Polish.

---

## Notes

- **[P]** = arquivos diferentes, sem dependência de tarefa incompleta.
- **[Story]** mapeia a tarefa à história, para rastreabilidade.
- **Commits**: após cada tarefa ou grupo lógico. PRs que alteram `src/layouts/` (inclusive `generation.json`) citam o manual e a versão (constituição).
- **Falha no teste de propriedade**: indica metadado errado em `generation.json` ou estratégia inválida. Corrija na origem; nunca relaxe o validador.
