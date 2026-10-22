---

description: "Lista de tarefas para implementar o Editor CNAB 240"
---

# Tasks: Editor CNAB 240

**Input**: Documentos de design em `/specs/001-cnab240-editor/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: OBRIGATÓRIOS. A constituição (Princípio IV, NON-NEGOTIABLE) exige TDD com golden files: em cada fase, escreva os testes primeiro e confirme que falham antes de implementar.

**Organization**: Tarefas agrupadas por história de usuário para que cada uma possa ser implementada e testada de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: História a que a tarefa pertence (US1…US5)
- Caminhos relativos à raiz do repositório (projeto único client-only, ver plan.md "Project Structure")

## Regras transversais (valem para TODAS as tarefas)

- Nenhuma posição de campo fora de `src/layouts/` (Princípio I). O motor só lê `start`/`end`/`match`/`totals` das definições.
- Nenhum `trim`, `trimStart`, `trimEnd` ou normalização de espaços/quebras no fluxo de conteúdo (FR-006b, FR-027a).
- Valores monetários e somas só como string de dígitos ou `BigInt`; ponto flutuante proibido (Princípio II).
- Golden files só com dados fictícios (Princípio V).
- Textos de interface em pt-BR, usando exatamente os modelos da tabela "Mensagens" de [contracts/ui-contract.md](contracts/ui-contract.md).
- Seletores `data-testid` exatamente como em [contracts/ui-contract.md](contracts/ui-contract.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do projeto e ferramentas

- [ ] T001 Criar `package.json` com dependências de runtime `preact@10` e `@preact/signals`, e dev `typescript@5`, `vite@6`, `@preact/preset-vite`, `vitest@3`, `happy-dom`, `@testing-library/preact`, `@playwright/test`, `eslint`, `typescript-eslint`, `ajv`, `ajv-formats`, `tsx`; scripts `dev`, `build`, `preview`, `test` (vitest run), `test:golden` (vitest run tests/golden), `test:e2e` (playwright test --grep-invert @perf), `test:perf` (playwright test --grep @perf), `lint`, `validate:layout` (tsx scripts/validate-layout.ts) em package.json
- [ ] T002 [P] Criar `tsconfig.json` com `target`/`lib` ES2022, `strict: true`, `jsx: "react-jsx"`, `jsxImportSource: "preact"`, `resolveJsonModule: true`, `moduleResolution: "bundler"`, tipos `vite/client` em tsconfig.json
- [ ] T003 [P] Criar `vite.config.ts` com `@preact/preset-vite`, `worker.format: "es"` e build sem assets externos em vite.config.ts
- [ ] T004 [P] Criar `index.html` com `lang="pt-BR"`, `<title>CNAB Editor</title>`, `<div id="app">` e a CSP exata de research.md R14: `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; script-src 'self'">` em index.html
- [ ] T005 [P] Criar `vitest.config.ts`: ambiente `node` para `tests/unit/**` e `tests/golden/**`, `happy-dom` para `tests/component/**`; excluir `tests/e2e/**` em vitest.config.ts
- [ ] T006 [P] Criar `playwright.config.ts` com projetos Chromium, Firefox e WebKit, `webServer` executando `npm run build && npm run preview`, `acceptDownloads: true`, `testDir: tests/e2e` em playwright.config.ts
- [ ] T007 [P] Criar `eslint.config.js` com typescript-eslint e regra `no-restricted-properties` proibindo `trim`, `trimStart`, `trimEnd` em `src/core/**`, `src/ui/state/**` e `src/workers/**`, e `no-restricted-globals` proibindo `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` em `src/**` em eslint.config.js
- [ ] T008 Criar a árvore de pastas do plan.md (`src/core/validate/`, `src/layouts/febraban-cnab240-v10.11/`, `src/workers/`, `src/ui/state/`, `src/ui/components/dialogs/`, `src/ui/styles/`, `scripts/`, `tests/golden/febraban-cnab240-v10.11/valid/`, `tests/golden/febraban-cnab240-v10.11/invalid/`, `tests/unit/`, `tests/component/`, `tests/e2e/`) e `src/main.tsx` que monta `<App />` em `#app` em src/main.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos, encoding, divisão de registros, carregador e esqueleto de layout, harness de golden files e casca da UI.

**⚠️ CRITICAL**: Nenhuma história começa antes desta fase terminar.

### Testes (escrever primeiro, devem falhar)

- [ ] T009 [P] Escrever tests/unit/encoding.test.ts: (a) propriedade `encodeLatin1(decodeLatin1(b)) === b` para todos os 256 valores de byte; (b) detecção: `TextDecoder('utf-8', { fatal: true })` decodifica **e** há byte ≥ 0x80 ⇒ `utf-8`, senão `iso-8859-1`; (c) BOM UTF-8 (EF BB BF) detectado e removido do texto; (d) encoder ISO-8859-1 grava `?` (0x3F) para code point > 0xFF, iterando por code point (`for…of`), de modo que um emoji (par substituto) vira **um** `?`
- [ ] T010 [P] Escrever tests/unit/split.test.ts: terminadores `\r\n`, `\n` e `\r` isolado reconhecidos e guardados por registro como `"CRLF" | "LF" | "CR" | ""`; quebras mistas preservadas; último registro com terminador `""` quando não há quebra final; conteúdo vazio ⇒ 0 registros; um único `\n` ⇒ 1 registro vazio com terminador `LF`; linhas só de espaços e espaços finais preservados caractere a caractere
- [ ] T011 [P] Escrever tests/unit/layout-integrity.test.ts verificando as `x-semantic-rules` de contracts/layout-definition.schema.json sobre o layout carregado: "`end >= start` e `end <= recordLength`; `size = end - start + 1`"; "os campos de cada registro, ordenados por `start`, cobrem 1..recordLength sem buracos nem sobreposições"; "todo `AllowedValue.code` tem comprimento igual ao `size` do campo"; "todo `domain.ref` aponta para uma chave existente em `domains`"; "todo `totals[].field` e `totals[].source.field` referenciam ids de campo existentes; `totals[].source.records` referenciam ids de RecordDefinition existentes"; "duas RecordDefinition com o mesmo `kind` não podem ser satisfeitas pela mesma combinação de linha + contexto de lote com o mesmo número de condições"; `id` de registro único no layout e `id` de campo único no registro; campo `type: "V"` tem `decimals`
- [ ] T012 [P] Escrever tests/component/Toasts.test.tsx: toasts empilhados, cada um some sozinho após 5000 ms (timers falsos), um não esconde o outro antes do tempo; `data-kind="success|error"` com classe/ícone distintos; região `data-testid="toast-region"` com `aria-live="polite"` e sem bloquear cliques fora do toast

### Implementação

- [ ] T013 Criar src/core/types.ts com todos os tipos de data-model.md: `LayoutDefinition` (`id`, `name`, `version`, `publishedAt`, `source {title,url}`, `recordLength`, `domains: Record<string, AllowedValue[]>`, `records` "≥ 1"), `RecordDefinition` (`kind` ∈ `"fileHeader" | "batchHeader" | "detail" | "batchTrailer" | "fileTrailer" | "batchInitial" | "batchFinal"`, `label`, `title`, `match`, `fields`, `totals?`), `MatchRule` (`{pos,equals}` | `{pos,in}` | `{batch: "operation" | "service" | "layoutVersion", in}`), `FieldDefinition` (`type` ∈ `"N" | "A" | "D" | "H" | "V"`, `decimals` "só para V; ≥ 0", `required`, `description`, `reference?`, `domain?` = `AllowedValue[] | {ref}`, `sensitive?`, `batchContext?`, `size` derivado), `AllowedValue`, `TotalRule` (`kind` ∈ `"countRecords" | "countBatches" | "sum"`, `source` "obrigatório quando kind = sum"; usar estes nomes do schema, não `count` de research.md R8), `CnabDocument` (`origin: "file" | "paste"`, `fileName?`, `encoding: "iso-8859-1" | "utf-8"`, `bom`, `direction: "remessa" | "retorno" | "unknown"`, `records`, `flags: Uint8Array` "bit 0 = alterada, bit 1 = com erro", `hasUnexportedChanges`), `CnabRecord`, `BatchContext`, `EditSession`, `ValidationError` (`line` 1-based, `start`, `end`, `fieldId?`, `fieldName?`, `found`, `expected?`, `rule`, `message`, `trigger: "input" | "blur" | "file"`), `ValidationRule` ∈ `length | type | required | domain | date | time | charset | lineLength | sequence | batchNumber | recordSequence | unknownRecord | totalMismatch | totalOverflow`, `ValidationReport`, `RecalcChange`, `Preferences`, `Toast`, `FieldView`, `ExportPlan`, `Trigger`
- [ ] T014 Implementar src/core/encoding.ts: `detectEncoding(bytes)`, `stripBom(bytes)`, `decodeLatin1` (byte → `String.fromCharCode`, nunca `TextDecoder('iso-8859-1')`, que vira windows-1252), `decodeUtf8`, `encodeLatin1(text): { bytes, unmappable: {index, char}[] }` com `?` por code point > 0xFF, `encodeUtf8` (faz T009 passar)
- [ ] T015 Implementar src/core/split.ts: `splitRecords(text): { content: string; terminator: "CRLF" | "LF" | "CR" | "" }[]` sem nenhuma normalização (faz T010 passar)
- [ ] T016 Criar src/layouts/febraban-cnab240-v10.11/layout.json com `id: "febraban-cnab240-v10.11"`, `name: "Layout Padrão CNAB 240"`, `version: "10.11"`, `publishedAt: "2023-08-21"`, `source.title: "Layout Padrão CNAB 240 – V10.11 – 21/08/2023"`, `source.url` = URL do PDF em FR-028, `recordLength: 240`, e `domains` compartilhados transcritos do manual: `tipoRegistro` (0–9 com significados, incluindo `3` = "Detalhe"), `tipoInscricao`, `codigoRemessaRetorno` (`1` remessa, `2` retorno), `tipoOperacao`, `tipoServico`, `formaLancamento`, `codigoBanco` (se tabelado no manual)
- [ ] T017 [P] Transcrever do manual v10.11 src/layouts/febraban-cnab240-v10.11/header-arquivo.json (`kind: "fileHeader"`, `label: "HA"`, `title: "Header de Arquivo"`, `match: [{pos:[8,8], equals:"0"}]`, todos os campos 1–240 com `reference` G0xx, `description`, `domain` quando codificado; "Código Remessa/Retorno" na pos. 143 com `domain: {ref: "codigoRemessaRetorno"}`; CNPJ/agência/conta com `sensitive: true`)
- [ ] T018 [P] Transcrever src/layouts/febraban-cnab240-v10.11/trailer-arquivo.json (`kind: "fileTrailer"`, `label: "TA"`, `title: "Trailer de Arquivo"`, `match: [{pos:[8,8], equals:"9"}]`, campos 1–240, `totals: [{field:<qtd lotes>, kind:"countBatches"}, {field:<qtd registros>, kind:"countRecords"}]` — contagem inclui HA e TA)
- [ ] T019 Implementar src/layouts/loader.ts: `import.meta.glob('./febraban-cnab240-v10.11/*.json', { eager: true })`, monta `LayoutDefinition` a partir de `layout.json` + um arquivo por `RecordDefinition`, calcula `size`, ordena `fields` por `start`, exporta `febrabanCnab240: LayoutDefinition` e `loadLayoutFromDir(path)` (Node, para testes/scripts) (faz T011 passar para HA/TA)
- [ ] T020 [P] Implementar scripts/validate-layout.ts: Ajv 2020-12 + ajv-formats validando o layout montado contra specs/001-cnab240-editor/contracts/layout-definition.schema.json; sai com código ≠ 0 e lista erros (alimenta `npm run validate:layout`)
- [ ] T021 [P] Criar tests/golden/harness.ts e tests/golden/README.md: enumera `tests/golden/febraban-cnab240-v10.11/{valid,invalid}/*.{rem,ret,txt}`, carrega o `<arquivo>.expected.json` irmão com formato `{ direction, labels: string[], errors: [{ line, start, end, fieldId?, rule }], recalc?: [{ line, fieldId, from, to }] }`; README documenta o formato e a regra "somente dados fictícios"
- [ ] T022 [P] Criar src/ui/styles/tokens.css (variáveis de cor para `[data-theme="dark"]` (padrão) e `[data-theme="light"]`: fundo, texto, seleção, indicador "alterada", indicador de erro, toast sucesso/erro — todos distintos entre si) e src/ui/styles/app.css (grid: cabeçalho, quadro principal à esquerda, coluna direita dividida em lista de campos/painel de detalhes, rodapé; fonte monoespaçada local para linhas)
- [ ] T023 [P] Implementar src/ui/state/toasts.ts (signal com fila; `showToast(kind, text)` com temporizador próprio de 5000 ms por toast) e src/ui/components/Toasts.tsx (faz T012 passar)
- [ ] T024 [P] Implementar src/ui/components/dialogs/Dialog.tsx: wrapper de `<dialog>` nativo com `showModal()`, `data-testid` via prop, `Esc` (evento `cancel`) equivale a cancelar, retorna foco ao elemento anterior ao fechar
- [ ] T025 Implementar src/ui/state/document.ts (signals `doc`, `flagsVersion` para invalidar linhas ao mudar `flags`, `selectedIndex`, `layout`) e src/ui/App.tsx com as regiões e `data-testid` de ui-contract.md (`app-header`, `main-pane`, `edit-pane`, `detail-pane`, `app-footer`, `toast-region`), aplicando `data-theme="dark"` em `<html>` por padrão; src/ui/components/Header.tsx com título "CNAB Editor" e subtítulo "Edite arquivos CNAB 240 com validação de campos em tempo real" (FR-002)

**Checkpoint**: `npm run test`, `npm run lint` e `npm run validate:layout` verdes; página abre com a casca vazia.

---

## Phase 3: User Story 1 - Carregar e inspecionar um arquivo CNAB 240 (Priority: P1) 🎯 MVP

**Goal**: Importar (.rem/.ret/.txt) ou colar conteúdo, ver as linhas com rótulo de tipo, indicador Remessa/Retorno, total de linhas, selecionar linha por clique/↑↓ e ver seus campos (posição, título, valor, contador) no quadro de edição.

**Independent Test**: Importar um golden file válido, selecionar cada tipo de linha e conferir campos, posições e valores com o layout FEBRABAN (cenários US1-1…US1-11; quickstart #1–#5).

### Golden files e testes (escrever primeiro, devem falhar)

- [ ] T026 [P] [US1] Criar golden files fictícios em tests/golden/febraban-cnab240-v10.11/valid/: `pagamento-remessa.rem` (HA, HL pagamentos, segmentos A, B, J, J-52, TL, TA; CRLF; com quebra final), `cobranca-retorno.ret` (HL cobrança, segmentos T, U; linhas com espaços finais; LF), `quebras-mistas.txt` (CRLF+LF, sem quebra final), `latin1-acentos.rem` (bytes 0x80–0xFF em campos alfanuméricos), `utf8-bom.rem` (BOM + acentos UTF-8); cada um com `*.expected.json` (direction, labels por linha, errors esperados)
- [ ] T027 [P] [US1] Criar golden files fictícios em tests/golden/febraban-cnab240-v10.11/invalid/: `linha-curta.rem` (linha com 238 caracteres), `segmento-desconhecido.rem` (detalhe com pos. 14 sem definição ⇒ rótulo = caractere da pos. 14, "Registro não reconhecido"), `tipo-desconhecido.rem` (pos. 8 = `7` ⇒ rótulo `?`), `sem-header.rem` (direção "unknown"), cada um com `*.expected.json`
- [ ] T028 [P] [US1] Escrever tests/unit/document.test.ts: `decodeFile` (origin `file`, `fileName`, encoding, `bom`, registros e terminadores); `fromPastedText` garante `records.map(r => r.current + sep(r)).join("") === t` com `sep = "\n"` para terminadores não vazios, sem remover espaços finais nem linhas só de espaços; `isAcceptedExtension` aceita `.rem`, `.ret`, `.txt` sem diferenciar maiúsculas e recusa o resto; `detectDirection` pela pos. 143 do HA (`1` remessa, `2` retorno, outro `unknown`), usando o primeiro registro com pos. 8 = `0` quando a primeira linha não é HA; `flags` zeradas e `hasUnexportedChanges = false` após carga
- [ ] T029 [P] [US1] Escrever tests/unit/resolve.test.ts: tipo por pos. 8 (`0` HA, `1` HL, `3` detalhe, `5` TL, `9` TA); contexto de lote (operação pos. 9, serviço pos. 10–11, versão pos. 14–16) herdado pelos detalhes e pelo TL até o próximo HL/TL; segmento pela pos. 14; variante J-52 resolvida por `match` adicional; vence a definição com mais condições satisfeitas; empate ou nenhuma ⇒ `definitionId = null`, rótulo `?` (ou o caractere da pos. 14 em detalhes); conteúdo nunca alterado
- [ ] T030 [P] [US1] Escrever tests/unit/fields.test.ts para `sliceFields`: fatia `current` por `start`/`end`; linha curta ⇒ campos até onde houver caracteres (`value` menor que `size`); registro não reconhecido ⇒ um campo sintético "Conteúdo bruto" 1..len; contador `filled`: N/V/D/H = comprimento após remover zeros à esquerda (todo zero conta 0), A = comprimento após remover espaços à direita (ex.: `"00000377654540"` em campo 14 N ⇒ `9/14`)
- [ ] T031 [P] [US1] Escrever tests/golden/parse.test.ts: para todo golden file, `decodeFile` + `resolveRecords` produz `direction` e `labels` iguais ao `expected.json`, e o texto concatenado dos `FieldView` de cada linha reconstitui a linha
- [ ] T032 [P] [US1] Escrever tests/component/MainPane.test.tsx: cada `line-row` com `data-line`, `line-label` separado do texto; `line-count` mostra "8 linhas"; clique marca `aria-selected="true"` só numa linha; ↓ na linha 3 seleciona a 4 e ↓ na última não faz nada; ↑/Home/End/PageUp/PageDown; digitar, Delete, Backspace e Ctrl+V não alteram o conteúdo (FR-006a); só linhas visíveis existem no DOM (virtualização); sem conteúdo ⇒ "Não há conteúdo para exibir"
- [ ] T033 [P] [US1] Escrever tests/component/PasteDialog.test.tsx: texto com espaços iniciais/finais, linhas só de espaços e quebra final chega ao `fromPastedText` idêntico; cancelar (botão ou Esc) não altera o documento
- [ ] T034 [P] [US1] Escrever tests/component/EditPane.view.test.tsx: `record-title` ("Detalhe – Segmento Q", "Não reconhecido" etc.), `line-position` ("Linha 3 de 8"); um `field` por campo na ordem das posições com `field-pos` ("19–32"), `field-name`, `input` com o valor e `field-counter` ("9/14"); contador atualiza ao digitar
- [ ] T035 [P] [US1] Escrever tests/e2e/us1-load.spec.ts cobrindo US1-1…US1-11: importar `.rem` (toast `Arquivo "<nome>" importado: <n> linhas`, indicador "Remessa", linha 1 selecionada); colar `cobranca-retorno.ret` (indicador "Retorno", conteúdo idêntico); cancelar colagem; quadro somente leitura; rótulos; "8 linhas"; seleção por clique e ↓; Segmento Q; contador `9/14`; extensão `.csv` recusada com toast `Arquivo não importado: extensão não aceita. Use .rem, .ret ou .txt`; falha de leitura ⇒ toast de erro; importar com alterações não exportadas abre `replace-content-dialog`

### Definições de layout (dados; tarefas paralelas por arquivo)

- [ ] T036 [P] [US1] Transcrever do manual v10.11 os registros do serviço Pagamentos em src/layouts/febraban-cnab240-v10.11/: `header-lote-pagamento*.json` (com `batchContext` em operação/serviço/versão), `trailer-lote-pagamento*.json` (com `totals[]` de `countRecords` e `sum` sobre os campos de valor definidos pelo manual), `segmento-a.json`, `segmento-b.json`, `segmento-c.json`, `segmento-j.json`, `segmento-j-52.json` (match pos. 18–19 = `"52"`), `segmento-n*.json`, `segmento-o.json`, `segmento-w.json`, `segmento-z.json`; cada campo com `name`, `start`, `end`, `type`, `decimals` (para V), `required`, `description`, `reference`, `domain` quando codificado e `sensitive` em CPF/CNPJ/agência/conta
- [ ] T037 [P] [US1] Transcrever do manual v10.11 os registros do serviço Cobrança em src/layouts/febraban-cnab240-v10.11/: `header-lote-cobranca*.json`, `trailer-lote-cobranca*.json` (remessa e retorno, com `totals[]` conforme o manual), `segmento-p.json`, `segmento-q.json`, `segmento-r.json`, `segmento-s*.json`, `segmento-t.json`, `segmento-u.json`, `segmento-y-*.json` (variantes por "Identificação Registro Opcional"), com os mesmos atributos de campo de T036
- [ ] T038 [P] [US1] Transcrever do manual v10.11 os demais serviços (Débito Automático e quaisquer outros serviços/segmentos do manual) em src/layouts/febraban-cnab240-v10.11/, incluindo registros `batchInitial`/`batchFinal` (pos. 8 = `2`/`4`) se definidos no manual, com os mesmos atributos de campo de T036
- [ ] T039 [US1] Criar src/layouts/febraban-cnab240-v10.11/COVERAGE.md: checklist por serviço/segmento (definição transcrita, página do manual, golden file que a exercita) e garantir `npm run validate:layout` e tests/unit/layout-integrity.test.ts verdes para todas as definições de T036–T038

### Implementação

- [ ] T040 [US1] Implementar src/core/resolve.ts: `resolveRecords(records, layout)` em duas passadas guiadas apenas por `match` (R6), preenchendo `definitionId`, `label` (rótulo da definição; para `detail`, o caractere da pos. 14 mesmo sem variante reconhecida; `?` para não reconhecido) e `batchContext` lido dos campos com `batchContext` do HL; `detectDirection(doc)` lendo o campo "Código Remessa/Retorno" via definição do HA (faz T029 passar)
- [ ] T041 [US1] Implementar src/core/document.ts: `decodeFile(bytes, fileName, layout)` (detectEncoding → stripBom → decode → splitRecords → resolveRecords → detectDirection; `original = current`; `flags = new Uint8Array(n)`), `fromPastedText(text, layout)` (origin `paste`, encoding `iso-8859-1`, nenhum caractere alterado), `isAcceptedExtension(fileName)` (faz T028 passar)
- [ ] T042 [US1] Implementar `sliceFields(record, layout)` e `filledCount(def, value)` em src/core/fields.ts conforme R7 (faz T030 e T031 passarem)
- [ ] T043 [US1] Adicionar ações de carga em src/ui/state/document.ts: `loadFromFile(file)` (recusa extensão com toast de erro; `file.arrayBuffer()`; `decodeFile`; toast de sucesso com nome e total; erro de leitura ⇒ toast `Arquivo não importado: <motivo>`), `loadFromPaste(text)`, seleção automática da linha 1, e confirmação via `replace-content-dialog` quando `hasUnexportedChanges` (FR-008)
- [ ] T044 [P] [US1] Implementar src/ui/components/dialogs/ReplaceContentDialog.tsx (`replace-content-dialog`, `replace-confirm`, `replace-cancel`)
- [ ] T045 [P] [US1] Implementar src/ui/components/dialogs/PasteDialog.tsx (`paste-dialog` com `<textarea>` livre, `paste-confirm`, `paste-cancel`; passa `textarea.value` sem nenhuma transformação) (faz T033 passar)
- [ ] T046 [US1] Implementar src/ui/components/VirtualLines.tsx: virtualização própria (R9) — altura fixa sem quebra; com quebra, `ceil(len / colunasVisíveis) × alturaDaLinha` com prefix-sum recalculado só em resize/troca de modo/carga; renderiza só linhas visíveis + margem; cada `line-row` com `data-line`, `line-label`, texto, `aria-selected`, `data-changed` (bit 0 de `flags`) e `data-error` (bit 1); `role="listbox"` + `aria-activedescendant`; recebe `wrap` (padrão `true`) como prop
- [ ] T047 [US1] Implementar src/ui/components/MainPane.tsx: cabeçalho com `line-count` ("N linhas"), estado vazio "Não há conteúdo para exibir", seleção por clique, teclado ↑/↓/Home/End/PageUp/PageDown com rolagem para manter a linha visível, bloqueio de edição direta; a troca de seleção passa por uma função `requestSelect(index)` em src/ui/state/document.ts (ganchos de edições pendentes entram em US3) (faz T032 passar)
- [ ] T048 [US1] Completar src/ui/components/Header.tsx: botão Importar (`<input type="file" accept=".rem,.ret,.txt">`), botão "Colar conteúdo" (abre PasteDialog), indicador de tipo "Remessa" / "Retorno" / "Não identificado"
- [ ] T049 [US1] Implementar src/ui/state/editSession.ts (`recordIndex`, `values`, `baseline` a partir de `sliceFields` da linha selecionada, `focusedFieldId`, `isDirty` derivado) e src/ui/components/FieldInput.tsx (`field` com `data-field-id`, `field-pos`, `field-name`, `input`, `field-counter`)
- [ ] T050 [US1] Implementar src/ui/components/EditPane.tsx: cabeçalho `record-title` (título da definição, "Não reconhecido" quando `definitionId = null`) e `line-position` ("Linha i de N"), lista de `FieldInput` na ordem das posições (faz T034 passar); integrar MainPane, EditPane e Header em src/ui/App.tsx (faz T035 passar)

**Checkpoint**: US1 funcional e testável sozinha; `npm run test:golden` (parse) e `tests/e2e/us1-load.spec.ts` verdes.

---

## Phase 4: User Story 2 - Entender um campo pelo painel de detalhes (Priority: P1)

**Goal**: Ao focar um campo, o painel inferior direito mostra nome, posições, tamanho, tipo, decimais, obrigatoriedade, descrição e, para campos codificados, todas as opções com a atual destacada (ou aviso de valor sem correspondência).

**Independent Test**: Focar campos N, A, D, V e codificado e comparar o painel com o manual (US2-1…US2-3; quickstart #6).

### Testes (escrever primeiro, devem falhar)

- [ ] T051 [P] [US2] Escrever tests/unit/domain.test.ts para `describeDomain(def, value, layout)`: `null` para campo sem `domain`; lista inline e `{ref}` resolvido em `layout.domains`; `match` = opção cujo `code === value`; valor fora das opções ⇒ `match: null`
- [ ] T052 [P] [US2] Escrever tests/component/DetailPane.test.tsx: exibe nome, "de/até", tamanho, tipo por extenso (N "Numérico", A "Alfanumérico", D "Data (DDMMAAAA)", H "Hora (HHMMSS)", V "Valor"), casas decimais só quando `type = V`, "Obrigatório: Sim/Não", descrição e referência; `domain-options` lista todas as opções com `aria-current="true"` na atual (`3 – Detalhe`); valor sem correspondência ⇒ `domain-no-match`; sem campo em foco ⇒ estado vazio
- [ ] T053 [P] [US2] Escrever tests/e2e/us2-detail.spec.ts: US2-1 ("Código de Barras" em Segmento J), US2-2 ("Tipo de Registro" = `3` destaca `3 – Detalhe`), US2-3 (valor fora das opções)

### Implementação

- [ ] T054 [US2] Implementar `describeDomain` em src/core/fields.ts (faz T051 passar)
- [ ] T055 [US2] Atualizar src/ui/components/FieldInput.tsx para definir `focusedFieldId` em src/ui/state/editSession.ts no `focus`
- [ ] T056 [US2] Implementar src/ui/components/DetailPane.tsx lendo `focusedFieldId` + valor atual da caixa (`values[focusedFieldId]`) e integrar em src/ui/App.tsx (faz T052 e T053 passarem)

**Checkpoint**: US1 + US2 funcionando de forma independente.

---

## Phase 5: User Story 3 - Editar campos e atualizar a linha (Priority: P1)

**Goal**: Editar valores com validação por tecla (tipo/tamanho) e ao sair do campo (domínio/datas), atualizar a linha alterando só os bytes dos campos editados, indicar linhas alteradas/com erro, tratar edições pendentes, validar estrutura e trailers e "Recalcular totais".

**Independent Test**: Editar um campo de um golden file, atualizar e comparar com o original — só as posições do campo mudam (US3-1…US3-11; quickstart #7–#11).

### Golden files e testes (escrever primeiro, devem falhar)

- [ ] T057 [P] [US3] Criar golden files fictícios em tests/golden/febraban-cnab240-v10.11/invalid/: `total-divergente.rem` (TL e TA com quantidades/somatório errados; `expected.json` com `errors` `totalMismatch` contendo `found`/`expected` e `recalc` com as mudanças esperadas), `sequencia-invalida.rem` (detalhe fora de lote, HL sem TL), `numero-lote-invalido.rem`, `sequencial-registro-invalido.rem`, `campos-invalidos.rem` (letra em campo N, opção fora do domínio, data `31022026`, hora `250000`, campo obrigatório vazio, alfanumérico com caractere fora do padrão FEBRABAN), `somatorio-18-digitos.rem` (somatório > 2^53), `lote-sem-trailer.rem`
- [ ] T058 [P] [US3] Escrever tests/unit/validate-field.test.ts: `trigger "input"` avalia só `length` e `type` (N/V/D/H só dígitos); `trigger "blur"` avalia todas (`length`, `type`, `required`, `domain`, `date`, `time`, `charset`); `D` aceita `00000000` quando `required: false` e valida dia/mês/ano reais (gregoriano, ano 4 dígitos); `H` valida 00–23/00–59/00–59; mensagens exatas: `Caractere inválido: o campo aceita apenas dígitos (0–9)`, `Opção inválida: "<valor>" não é um valor permitido para este campo`, `Data inválida: "<valor>" não é uma data DDMMAAAA válida`; cada erro com `line`, `start`, `end`, `fieldId`, `fieldName`, `found`, `rule`, `trigger`
- [ ] T059 [P] [US3] Escrever tests/unit/validate-record.test.ts (`lineLength` quando ≠ 240 com o tamanho encontrado; `unknownRecord` informativo; todos os campos da linha) e tests/unit/validate-structure.test.ts (`sequence` HA→HL→detalhes→TL→TA, `batchNumber` pos. 4–7 coerente com o lote, `recordSequence` sequencial no lote apenas validado)
- [ ] T060 [P] [US3] Escrever tests/unit/totals.test.ts: validação `totalMismatch` com `found` e `expected` e mensagem `Total divergente: encontrado <x>, esperado <y>`; `countRecords` do TL inclui HL e TL; TA conta lotes e registros incluindo HA e TA; `sum` com `BigInt` sobre 18 dígitos sem perda; resultado com zeros à esquerda; estouro do tamanho ⇒ `totalOverflow` e campo não gravado; `recalculateTotals` não cria/remove registros, altera só campos totalizadores, retorna `changes` `{line, recordTitle, fieldName, from, to}`; trailers consistentes ⇒ `changes` vazio e nenhum registro alterado; lote sem TL ⇒ só trailers existentes recalculados; serviço sem somatório ⇒ só quantidades
- [ ] T061 [P] [US3] Escrever tests/unit/apply-edits.test.ts: campo com `value === baseline` reaproveita o trecho original mesmo fora do padrão (ex.: numérico com espaços); campo alterado N/V/D/H ⇒ `padStart("0")`, A ⇒ `padEnd(" ")`; nunca trunca; todos os caracteres fora dos campos editados idênticos (FR-019, SC-003); editar de volta ao original ⇒ linha igual a `original`
- [ ] T062 [P] [US3] Escrever tests/golden/validation.test.ts (erros de `validateDocument` iguais aos `expected.json` de todos os golden files, por linha/posição/campo/regra) e tests/golden/recalc.test.ts (`recalculateTotals` produz o `recalc` esperado e, aplicado, zera os `totalMismatch`)
- [ ] T063 [P] [US3] Escrever tests/unit/validation-worker.test.ts para a lógica do worker extraída em src/workers/validation.worker.ts: mensagens `{type:"validate", jobId, records}` ⇒ `progress` em lotes de ~5000 linhas com `processed`, `total`, `errors` ⇒ `done`; `{type:"cancel", jobId}` interrompe; jobs antigos ignorados
- [ ] T064 [P] [US3] Escrever tests/component/EditPane.edit.test.tsx: `maxlength` = `size` e filtro em `beforeinput` para colagem acima do tamanho (contador `14/14`); letra em campo N ⇒ `field-error` imediato e campo destacado; opção inválida só aparece no `blur`, não durante a digitação; corrigir e sair remove destaque/mensagem; `aria-describedby` liga input à mensagem; `update-line` no canto inferior esquerdo com seta ← e `discard` ao lado; Descartar restaura `baseline`; Tab percorre campos na ordem das posições
- [ ] T065 [P] [US3] Escrever tests/e2e/us3-edit.spec.ts cobrindo US3-1…US3-11: validação por tecla e ao sair; atualizar linha válida (toast `Linha <n> atualizada`, `data-changed`, só posições do campo mudam); atualizar com erro (toast `Linha <n> atualizada com <k> campo(s) com erro`, `data-error` distinto de `data-changed`, some ao corrigir); `pending-edits-dialog` ao clicar/↓ em outra linha com Atualizar/Descartar/Cancelar; contador de erros navega ao próximo erro e foca o campo; TL/TA divergentes sinalizados; `recalc-dialog` lista de → para e marca trailers como alterados; sem divergências ⇒ "não havia divergências" e nenhum byte muda; editar de volta ao original remove `data-changed`

### Implementação

- [ ] T066 [P] [US3] Implementar src/core/validate/field.ts: `validateField(def, value, trigger, layout)` com regras `length`, `type`, `required`, `domain`, `date`, `time`, `charset` e momentos de disparo de data-model.md §4 (faz T058 passar)
- [ ] T067 [P] [US3] Implementar src/core/validate/record.ts: `validateRecord(record, layout)` (`lineLength`, `unknownRecord`, `validateField(..., "blur")` em todos os campos via `sliceFields`)
- [ ] T068 [P] [US3] Implementar src/core/validate/structure.ts: `sequence`, `batchNumber`, `recordSequence` (faz T059 passar com T067)
- [ ] T069 [P] [US3] Implementar src/core/validate/totals.ts: cálculo dos valores esperados a partir de `totals[]` (agrupamento HL…TL com "Lote de Serviço" pos. 4–7 lido via definição como critério auxiliar), `totalMismatch`/`totalOverflow`, e `recalculateTotals(doc, layout)` retornando `{ records: Map<number,string>, changes, errors }` com `BigInt` (faz T060 passar)
- [ ] T070 [US3] Implementar src/core/validate/index.ts: `validateDocument(doc, layout): ValidationReport` (`errors` ordenados por linha/posição, `byLine`, `total`, `status`) e reexportar `validateField`/`validateRecord` (faz T062 passar)
- [ ] T071 [US3] Implementar `applyEdits(current, fields, values, baseline)` em src/core/fields.ts (faz T061 passar)
- [ ] T072 [US3] Implementar src/workers/validation.worker.ts com o protocolo de contracts/core-api.md, importando o layout estaticamente e chamando `validateDocument` em lotes de ~5000 linhas (faz T063 passar)
- [ ] T073 [US3] Implementar src/ui/state/validation.ts: cliente do worker (`jobId`, cancelamento do job anterior), signal `report` com `status: "running" | "done"`, atualização do bit 1 de `flags` por linha e `flagsVersion`; disparo após carga, após "Atualizar linha" e após "Recalcular totais"
- [ ] T074 [US3] Completar src/ui/state/editSession.ts: `fieldErrors`; `onInput` (validação `input`, síncrona) e `onBlur` (validação `blur`); `updateLine()` (`applyEdits` → `current`, bit 0 = `current !== original`, `hasUnexportedChanges = true`, `validateRecord` síncrona da linha para o bit 1, novo `baseline`, revalidação do documento, toast de US3-5a); `discard()` restaura `baseline`
- [ ] T075 [US3] Atualizar src/ui/components/FieldInput.tsx: `maxLength = size`, filtro `beforeinput` para colagem além do tamanho (sem truncar o que já existe), destaque de erro, `field-error` abaixo da caixa com a mensagem atual, `aria-describedby`
- [ ] T076 [US3] Atualizar src/ui/components/EditPane.tsx com rodapé: `update-line` "← Atualizar linha" no canto inferior esquerdo e `discard` "Descartar" ao lado, conforme specs/001-cnab240-editor/attachments/esboco-quadro-edicao.svg (faz T064 passar)
- [ ] T077 [P] [US3] Implementar src/ui/components/dialogs/PendingEditsDialog.tsx (`pending-edits-dialog`, `pending-update`, `pending-discard`, `pending-cancel`) e ligá-lo a `requestSelect(index)` em src/ui/state/document.ts para clique e teclado (FR-022)
- [ ] T078 [P] [US3] Implementar src/ui/components/dialogs/RecalcDialog.tsx (`recalc-dialog` com itens `recalc-change`: registro, campo, de → para; ou "não havia divergências") e a ação `recalculate()` em src/ui/state/document.ts (aplica `records`, marca bit 0, `hasUnexportedChanges = true` só se houve mudança, revalida)
- [ ] T079 [US3] Atualizar src/ui/components/Header.tsx com contador de erros (total ou "validando…"; clique seleciona a linha do próximo erro e foca o campo, via `requestSelect`) e botão "Recalcular totais"; estilos distintos de `data-changed` e `data-error` em src/ui/styles/app.css (faz T065 passar)

**Checkpoint**: MVP completo (US1+US2+US3); `npm run test:golden` inclui validação e recálculo.

---

## Phase 6: User Story 4 - Exportar ou copiar o resultado (Priority: P2)

**Goal**: Exportar `.rem`/`.ret` com nome `cnabeditor_AAAAMMDDHHMMSS`, round-trip byte a byte para conteúdo importado, CRLF + ISO-8859-1 para conteúdo colado, confirmações de erros/charset/extensão, Copiar, e link do manual no rodapé.

**Independent Test**: Exportar um arquivo importado sem edição e comparar byte a byte; copiar e colar em outro editor e comparar (US4-1…US4-5; quickstart #12–#14).

### Testes (escrever primeiro, devem falhar)

- [ ] T080 [P] [US4] Escrever tests/unit/export.test.ts: origin `file` ⇒ encoding, BOM e terminador original por registro; origin `paste` ⇒ ISO-8859-1, terminadores não vazios ⇒ CRLF, ausência/presença de quebra final preservada, code point > U+00FF ⇒ `?` com `unmappable` listando `{line, position, char}` (emoji conta como uma posição); `toClipboardText` = conteúdo atual + terminadores originais, sem rótulos; `exportFileName(new Date(2026, 9, 22, 11, 52, 7), "rem") === "cnabeditor_20261022115207.rem"` com todos os componentes com zeros à esquerda
- [ ] T081 [P] [US4] Escrever tests/golden/roundtrip.test.ts (gate de merge): para TODO golden file, `encodeForExport(decodeFile(bytes)).bytes` idêntico byte a byte a `bytes`; e pipeline colar → copiar/exportar para golden files com espaços finais e linhas só de espaços (SC-005b)
- [ ] T082 [P] [US4] Escrever tests/e2e/us4-export.spec.ts: download `cnabeditor_AAAAMMDDHHMMSS.rem` com relógio fixado (`page.clock`) e toast `Arquivo "<nome>" exportado`; bytes do download iguais ao original; ordem dos diálogos extensão → erros (`export-errors-dialog` com a quantidade) → charset (`export-charset-dialog` com quantidade, linhas e posições) → download; cancelar em qualquer diálogo não baixa; falha ⇒ toast `Arquivo não exportado: <motivo>`; `copy` grava na área de transferência e mostra `Copiado ✓` por 2 s; exportar/copiar desabilitados sem conteúdo; `manual-link` com `target="_blank"` e `rel="noopener noreferrer"`

### Implementação

- [ ] T083 [US4] Implementar src/core/export.ts: `encodeForExport(doc)`, `toClipboardText(doc)`, `exportFileName(now, ext)` (faz T080 e T081 passarem)
- [ ] T084 [P] [US4] Implementar src/ui/components/dialogs/ExportExtDialog.tsx (`export-ext-dialog`, `ext-rem`, `ext-ret`, `export-cancel`), ExportErrorsDialog.tsx (`export-errors-dialog`, quantidade de erros, `export-confirm`, `export-cancel`) e ExportCharsetDialog.tsx (`export-charset-dialog`, total e as 50 primeiras ocorrências linha/posição, `export-confirm`, `export-cancel`) em src/ui/components/dialogs/
- [ ] T085 [US4] Implementar src/ui/state/export.ts: fluxo extensão → erros → charset → download (`Blob` + `<a download>` + `URL.revokeObjectURL`), `hasUnexportedChanges = false` após sucesso (flags "alterada" mantidas), toasts de sucesso/erro; `copyToClipboard()` com `navigator.clipboard.writeText` e fallback `document.execCommand('copy')` em textarea oculto
- [ ] T086 [US4] Implementar src/ui/components/Footer.tsx: botões `export` e `copy` (desabilitados sem conteúdo; `Copiado ✓` por 2 s), e `manual-link` "Layout Padrão CNAB 240 – V10.11 – 21/08/2023" lido de `layout.source` (FR-028), em nova aba; integrar em src/ui/App.tsx (faz T082 passar)

**Checkpoint**: US1–US4 funcionando; ciclo importar → editar → exportar completo.

---

## Phase 7: User Story 5 - Personalizar a área de trabalho (Priority: P3)

**Goal**: Divisórias redimensionáveis com mínimos, quebra de linha e tema alternáveis, tudo persistido em `localStorage` e restaurado ao recarregar.

**Independent Test**: Alterar divisórias, quebra de linha e tema, recarregar e verificar restauração; em navegação privada/armazenamento limpo, padrões (US5-1…US5-5; quickstart #15).

### Testes (escrever primeiro, devem falhar)

- [ ] T087 [P] [US5] Escrever tests/unit/prefs.test.ts conforme contracts/preferences.md: chave `cnabeditor.prefs.v1`; padrões `theme: "dark"`, `wrap: true`, `splitMainPct: 55`, `splitRightPct: 55`; `theme` só `"dark" | "light"`; `splitMainPct` e `splitRightPct` "number, faixa 10–90"; campo ausente, de tipo errado ou fora da faixa ⇒ padrão daquele campo; JSON inválido ou `localStorage` lançando exceção ⇒ padrões sem erro visível; nada além das preferências é gravado
- [ ] T088 [P] [US5] Escrever tests/component/Splitter.test.tsx: `role="separator"`, `aria-valuenow`; arrastar com Pointer Events altera a porcentagem; setas movem 2%; mínimos em px (principal ≥ 320, lista de campos ≥ 160, detalhes ≥ 120, lado direito ≥ 360) prevalecem sem reescrever a porcentagem salva; gravação só ao soltar
- [ ] T089 [P] [US5] Escrever tests/e2e/us5-prefs.spec.ts: primeiro acesso dark + quebra ativada + divisórias padrão; mover `split-main` e `split-right`, desligar quebra (cada registro em uma linha visual com rolagem horizontal), trocar para light, recarregar ⇒ tudo restaurado; contexto com `localStorage` indisponível ⇒ padrões

### Implementação

- [ ] T090 [US5] Implementar src/ui/prefs.ts (`loadPrefs()`, `savePrefs(p)` com `try/catch` e saneamento por campo) e signal `prefs` em src/ui/state/prefs.ts (faz T087 passar)
- [ ] T091 [US5] Implementar src/ui/components/Splitter.tsx (`setPointerCapture`, porcentagem do contêiner, mínimos em px, teclado, salva ao soltar) e usar `split-main` (horizontal) e `split-right` (vertical, detalhes = 100 − `splitRightPct`) em src/ui/App.tsx (faz T088 passar)
- [ ] T092 [US5] Adicionar em src/ui/components/Header.tsx os alternadores de quebra de linha e de tema; aplicar `data-theme` em `<html>` a partir de `prefs.theme` em src/ui/App.tsx; passar `prefs.wrap` ao VirtualLines.tsx e recalcular alturas na troca de modo (faz T089 passar)

**Checkpoint**: Todas as histórias funcionando de forma independente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Privacidade, desempenho, guardas de regressão e documentação

- [ ] T093 [P] Escrever tests/e2e/privacy.spec.ts: após o carregamento inicial, registrar `page.on('request')` e executar importar → editar → atualizar → recalcular → exportar → copiar; asserir zero requisições (SC-008) e presença da CSP `connect-src 'none'`
- [ ] T094 [P] Criar scripts/generate-perf-files.ts gerando arquivos fictícios válidos de 10.000 e 100.000 linhas em tests/e2e/fixtures/ (ignorados pelo git) e tests/e2e/perf.spec.ts marcado `@perf`: 10k linhas carregadas e exibidas ≤ 3 s; com 100k, rolagem/seleção/edição sem tarefa longa > 200 ms (PerformanceObserver `longtask` no Chromium); seleção de linha → campos ≤ 200 ms; validação por tecla ≤ 200 ms
- [ ] T095 [P] Escrever tests/unit/no-trim.test.ts: percorre colar → `fromPastedText` → `toClipboardText`/`encodeForExport` com espaços iniciais/finais, múltiplos espaços e linhas só de espaços e afirma igualdade caractere a caractere; confirmar que `npm run lint` acusa `trim` adicionado em `src/core`
- [ ] T096 [P] Implementar src/core/mask.ts (`maskValue(def, value)` para campos `sensitive: true`) e usá-lo em todo `console.*` de desenvolvimento em src/ui/state/ e src/workers/; teste em tests/unit/mask.test.ts; garantir que toasts e mensagens não incluem CPF/CNPJ/conta (Princípio V)
- [ ] T097 [P] Revisar src/layouts/febraban-cnab240-v10.11/COVERAGE.md: toda definição tem ao menos um golden file que a exercita (criar os faltantes em tests/golden/febraban-cnab240-v10.11/valid/ com `expected.json`)
- [ ] T098 [P] Atualizar README.md com stack, comandos de quickstart.md e a regra de golden files fictícios
- [ ] T099 Executar todos os comandos e os 17 cenários manuais de specs/001-cnab240-editor/quickstart.md e registrar o resultado no PR
- [ ] T100 Após o merge, emendar .specify/memory/constitution.md via `/speckit-constitution` substituindo `TODO(TECH_STACK)` pela stack de research.md R1 (follow-up de governança do plan.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; BLOQUEIA todas as histórias.
- **US1 (Phase 3)**: depende da Foundational. Fornece `sliceFields`, seleção, EditPane e as definições de layout de todos os serviços, usados pelas demais histórias.
- **US2 (Phase 4)**: depende de US1 (campos exibidos e foco no FieldInput).
- **US3 (Phase 5)**: depende de US1 (EditPane/FieldInput/seleção). Independente de US2.
- **US4 (Phase 6)**: depende da Foundational + `decodeFile`/`fromPastedText` de US1. A exportação de conteúdo com erros (ExportErrorsDialog) usa o `report` de US3; sem US3 o fluxo trata o total de erros como 0.
- **US5 (Phase 7)**: depende de US1 (VirtualLines com `wrap`) e da casca da Foundational. Independente de US2–US4.
- **Polish (Phase 8)**: depois das histórias desejadas.

### User Story Dependencies

```text
Setup → Foundational → US1 ─┬─▶ US2
                            ├─▶ US3 ─▶ (US4 diálogo de erros)
                            ├─▶ US4
                            └─▶ US5
                                      → Polish
```

### Within Each User Story

- Golden files e testes primeiro; confirmar que falham.
- Dados de layout → core (puro) → state → componentes → integração no App.
- Arquivos compartilhados entre histórias (fields.ts, editSession.ts, FieldInput.tsx, EditPane.tsx, Header.tsx, App.tsx, document.ts) são alterados em sequência, na ordem das fases.

### Parallel Opportunities

- Setup: T002–T007 em paralelo após T001.
- Foundational: testes T009–T012 em paralelo; T017/T018, T020–T024 em paralelo após T013.
- US1: T026–T035 (golden files e testes) em paralelo; T036–T038 (transcrição por serviço) em paralelo entre si e com os testes; T044/T045 em paralelo.
- US2: T051–T053 em paralelo.
- US3: T057–T065 em paralelo; T066–T069 em paralelo; T077/T078 em paralelo.
- US4: T080–T082 em paralelo.
- US5: T087–T089 em paralelo; US5 pode correr em paralelo com US2/US3/US4 após US1.
- Polish: T093–T098 em paralelo.

---

## Parallel Example: User Story 1

```bash
# Golden files e testes de US1 juntos:
Task: "Criar golden files válidos em tests/golden/febraban-cnab240-v10.11/valid/"
Task: "Escrever tests/unit/document.test.ts"
Task: "Escrever tests/unit/resolve.test.ts"
Task: "Escrever tests/unit/fields.test.ts"
Task: "Escrever tests/component/MainPane.test.tsx"

# Transcrição do layout por serviço, em paralelo:
Task: "Transcrever Pagamentos em src/layouts/febraban-cnab240-v10.11/"
Task: "Transcrever Cobrança em src/layouts/febraban-cnab240-v10.11/"
Task: "Transcrever demais serviços em src/layouts/febraban-cnab240-v10.11/"
```

## Parallel Example: User Story 3

```bash
# Validadores puros em arquivos separados:
Task: "Implementar src/core/validate/field.ts"
Task: "Implementar src/core/validate/record.ts"
Task: "Implementar src/core/validate/structure.ts"
Task: "Implementar src/core/validate/totals.ts"
```

---

## Implementation Strategy

### MVP First

A spec marca US1, US2 e US3 como P1; o MVP mínimo demonstrável é **US1** (carregar e inspecionar), e o MVP de produto é **US1 + US2 + US3**.

1. Phase 1 (Setup) → Phase 2 (Foundational).
2. Phase 3 (US1) → **parar e validar**: importar golden files, conferir campos, `test:golden` parse verde.
3. US2 → US3 → validar o MVP de produto (inspecionar, consultar, editar com segurança).

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → demo (substitui contar posições à mão).
3. US2 → demo (substitui consultar o PDF).
4. US3 → demo (edição segura + totais) — MVP de produto.
5. US4 → ciclo completo com exportação.
6. US5 → conforto.
7. Polish → privacidade/desempenho verificados.

### Parallel Team Strategy

1. Equipe conclui Setup + Foundational.
2. Durante US1: uma pessoa no motor/UI, outras na transcrição do layout (T036–T038).
3. Após US1: Dev A → US2 e depois US4; Dev B → US3; Dev C → US5.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- [Story] mapeia a tarefa à história para rastreabilidade.
- Commit após cada tarefa ou grupo lógico; PRs que alteram `src/layouts/` citam manual e versão (constituição).
- Todo bug corrigido ganha golden file ou teste que o reproduza.
