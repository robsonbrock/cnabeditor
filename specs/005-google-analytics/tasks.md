---

description: "Task list for feature 005-google-analytics"
---

# Tasks: Medição de Uso com Google Analytics

**Input**: Design documents from `/specs/005-google-analytics/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/analytics-events.md](contracts/analytics-events.md), [contracts/ui-contract.md](contracts/ui-contract.md), [quickstart.md](quickstart.md)

**Tests**: obrigatórios. O Princípio IV da constituição exige TDD: escrever os testes, confirmar que falham e só então implementar.

**Organization**: o Setup isola os testes da propriedade real antes de qualquer código de medição. Depois vêm US1 (carregamento e visitas), US2 (eventos das ações) e US3 (aviso no rodapé). US2 depende do módulo criado em US1; US3 depende só do Setup. A primeira publicação exige US1 + US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: história a que a tarefa pertence (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: garantir, antes de existir qualquer medição, que dev e testes nunca falem com a propriedade `G-TKLBD459FS` (FR-002, research A2).

- [ ] T001 Em `playwright.config.ts`, trocar o `webServer.command` de `"npm run build && npm run preview"` para `"npm run build -- --mode e2e && npm run preview"`. O npm acrescenta `--mode e2e` ao `vite build` do script `build`. Rodar `npm run test:e2e` e confirmar que a suíte inteira continua verde, sem nenhum outro ajuste.
- [X] T002 [P] Em `eslint.config.js`, acrescentar ao bloco `files: ["src/**"]` as entradas `{ name: "gtag", message: "Use track() de src/ui/analytics.ts (005, research A13)." }` e `{ name: "dataLayer", message: "Use track() de src/ui/analytics.ts (005, research A13)." }` em `no-restricted-globals`, mantendo as de `noNetwork`. Adicionar um bloco final `{ files: ["src/ui/analytics.ts"], rules: { "no-restricted-globals": ["error", ...noNetwork] } }` para liberar só esse arquivo. Rodar `npm run lint`: deve passar.
- [ ] T003 [P] Antes de qualquer instrumentação, rodar `npm run test:perf` e registrar em `specs/005-google-analytics/perf-baseline.md` os tempos de abrir, validar e exportar 10.000 e 100.000 linhas (mediana de 3 execuções). É a base de comparação do SC-004.

**Checkpoint**: E2E roda em modo `e2e`; o lint barra `gtag`/`dataLayer` fora do módulo de medição.

---

## Phase 2: User Story 1 - Saber quantas pessoas usam o editor (Priority: P1) 🎯 MVP

**Goal**: o build publicado carrega o gtag.js com `G-TKLBD459FS`, registra a visita com sinais de publicidade desligados e título e endereço fixos, e libera na CSP só os domínios do GA4. Fora de produção nada é carregado, e o Google bloqueado não afeta o editor.

**Independent Test**: `npx playwright test --project=analytics-prod` verde (script pedido com o ID, CSP de produção, editor funcionando com o Google bloqueado). Depois de publicar, a visita aparece no relatório em tempo real (quickstart Q6).

### Tests for User Story 1 ⚠️

> **Escreva estes testes primeiro e confirme que FALHAM antes da implementação.**

- [ ] T004 [P] [US1] Criar `tests/unit/csp.test.ts` (projeto Vitest `node`) para `analyticsCsp(base: string): string`, importada de `src/build/csp.ts`. Usar como `base` a CSP atual do `index.html`, lida do arquivo com `readFileSync`, para o teste acompanhar o HTML. Casos:
  - (a) `script-src` vira exatamente `'self' https://*.googletagmanager.com`;
  - (b) `connect-src` vira exatamente `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` e não contém `'none'`;
  - (c) `img-src` vira exatamente `'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com`;
  - (d) `default-src 'self'`, `style-src 'self' 'unsafe-inline'` e `worker-src 'self' blob:` ficam idênticas;
  - (e) a ordem das diretivas é preservada e nenhuma diretiva nova aparece.
- [ ] T005 [P] [US1] Criar `tests/unit/analytics.test.ts` (projeto Vitest `node`, com `globalThis.window`, `document` e `location` simulados por objetos mínimos, ou mover para `tests/component/analytics.test.tsx` se happy-dom for mais simples). Testar `initAnalytics({ load, doc?, win? })` de `src/ui/analytics.ts`:
  - (a) Com `load: false`, `win.dataLayer` recebe, nesta ordem, `["js", <Date>]` e `["config", MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false, page_title: "CNAB Editor", page_location: "<origin>/" }]`, e nenhum `<script>` é criado.
  - (b) Com `load: true`, existe exatamente um `<script>` com `async === true` e `src === GTAG_SRC` no `<head>`.

  `MEASUREMENT_ID` e `GTAG_SRC` vêm de `src/ui/analytics-id.ts` (T010); o teste não repete o ID literal.
  - (c) Chamar `initAnalytics` duas vezes não duplica o script nem o `config`.
  - (d) `page_location` ignora `location.search` e `location.hash`: com `href` `https://x.test/?nome=a#b`, o valor é `https://x.test/`.
  - (e) Disparar o `onerror` do script não lança e não registra nada no console.
  - (f) `ANALYTICS_ENABLED` exportado é `false` no Vitest (modo `test`).
- [ ] T006 [P] [US1] Criar `tests/e2e/analytics-prod.spec.ts`. No `beforeEach`, `await context.route(/https:\/\/([^/]+\.)?(googletagmanager|google-analytics|analytics\.google)\.com\//, r => { requested.push(r.request().url()); return r.abort(); })`. Casos:
  - (a) depois de `page.goto("/")`, `requested` contém `GTAG_SRC`, importado de `src/ui/analytics-id.ts`;
  - (b) a CSP do `<meta http-equiv="Content-Security-Policy">` é a de produção do `contracts/ui-contract.md`;
  - (c) importar `golden("valid/pagamento-remessa.rem")`, editar `valorPagamento` da linha 3, `update-line`, `recalc`/`recalc-close` e `export` com download concluído funcionam, e nenhum toast de erro aparece (FR-003, SC-003);
  - (d) `page.on("console")` não registra erros além dos de requisições bloqueadas para domínios do Google.
- [ ] T007 [US1] Em `playwright.config.ts`:
  - transformar `webServer` em array, mantendo o atual (porta 4173, `--mode e2e`) e acrescentando `{ command: "npx vite build --outDir dist-prod && npx vite preview --outDir dist-prod --port 4174 --strictPort", url: "http://localhost:4174", reuseExistingServer: !process.env.CI, timeout: 120_000 }`;
  - acrescentar o projeto `{ name: "analytics-prod", testMatch: /analytics-prod\.spec\.ts/, use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:4174" } }`;
  - nos projetos `chromium`, `firefox` e `webkit`, acrescentar `testIgnore: /analytics-prod\.spec\.ts/`;
  - adicionar `dist-prod/` ao `.gitignore` e aos `ignores` do `eslint.config.js`.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Criar `src/build/csp.ts` com `export const ANALYTICS_HOSTS = { script: ["https://*.googletagmanager.com"], connect: ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"], img: ["https://*.google-analytics.com", "https://*.googletagmanager.com"] }` e `export function analyticsCsp(base: string): string`, que:
  - separa as diretivas por `;`;
  - em `script-src` e `img-src`, acrescenta os hosts aos valores existentes;
  - em `connect-src`, substitui `'none'` pelos hosts;
  - devolve na mesma ordem, unido por `"; "`.

  Comentário de uma linha citando research A3. Faz T004 passar.
- [ ] T009 [US1] Em `vite.config.ts`:
  - trocar `defineConfig({...})` por `defineConfig(({ command, mode }) => ({...}))`;
  - acrescentar a `plugins` um plugin inline `{ name: "analytics-csp", transformIndexHtml: (html) => command === "build" && mode === "production" ? html.replace(/(http-equiv="Content-Security-Policy" content=")([^"]+)/, (_, a, csp) => a + analyticsCsp(csp)) : html }`, importando `analyticsCsp` de `./src/build/csp`;
  - atualizar o comentário de `assetsInlineLimit` para "Tudo empacotado localmente: nenhum asset externo no bundle (Princípio V); só o build production carrega o gtag.js (005)".
- [ ] T010 [US1] Criar `src/ui/analytics-id.ts`, única fonte do ID de medição no código, sem `import.meta` para poder ser importado pelo Playwright no Node:
  - `export const MEASUREMENT_ID = "G-TKLBD459FS";`
  - `export const GTAG_SRC = \`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}\`;`

  Criar `src/ui/analytics.ts` com:
  - `MEASUREMENT_ID` e `GTAG_SRC` importados de `./analytics-id`, e `export const ANALYTICS_ENABLED = import.meta.env.MODE === "production"`;
  - a declaração global `interface Window { dataLayer?: unknown[] }`;
  - uma função `gtag` **no nível do módulo**, não exportada, com a assinatura `function gtag(..._args: unknown[]): void { (window.dataLayer ??= []).push(arguments); }`. Precisa ser `arguments`, não array: o gtag.js exige o objeto `arguments`, como na tag original. Ela cria o `dataLayer` sob demanda, para funcionar antes de `initAnalytics`. Para os testes poderem injetar `win`, aceitar `win` via uma variável de módulo `target: Window = window` que `initAnalytics` sobrescreve, e usar `target` no lugar de `window`. `initAnalytics` (abaixo) e `track` (T016) usam essa mesma função; nenhuma outra cópia;
  - `export function initAnalytics({ load = ANALYTICS_ENABLED, doc = document, win = window } = {})`, idempotente (flag de módulo), que:
    - faz `target = win` e garante `win.dataLayer ??= []`;
    - chama `gtag("js", new Date())` e `gtag("config", MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false, page_title: "CNAB Editor", page_location: win.location.origin + "/" })`;
    - se `load`, cria `<script async src=GTAG_SRC>` com `onerror = () => {}` e o anexa ao `<head>`.

  Comentário JSDoc citando research A1, A2, A4 e A7. Faz T005 passar.
- [ ] T011 [US1] Em `src/main.tsx`, importar `initAnalytics` de `./ui/analytics` e chamá-lo logo depois do `render(...)` (research A7).
- [ ] T012 [US1] Rodar `npm run test`, `npm run lint`, `npm run build` (confirmar com `grep` que `dist/index.html` tem a CSP de produção) e `npx playwright test --project=analytics-prod`: tudo verde. Confirmar que `npm run test:e2e`, com `privacy.spec.ts` intacto, continua verde (quickstart Q1, Q2, Q5).

**Checkpoint**: o build de produção registra visitas, e dev e testes não falam com o Google. **Ainda não publicar**: o MVP só fica completo com a US3 (aviso no rodapé, FR-010).

---

## Phase 3: User Story 2 - Saber quais ações os usuários executam (Priority: P2)

**Goal**: cada ação do catálogo de [contracts/analytics-events.md](contracts/analytics-events.md) gera exatamente um evento, só com números e enums, nunca com dados do arquivo.

**Independent Test**: `npx playwright test tests/e2e/analytics.spec.ts` verde nos 3 navegadores (um evento por ação e auditoria SC-002 do `dataLayer`), sem requisições ao Google.

### Tests for User Story 2 ⚠️

> **Escreva estes testes primeiro e confirme que FALHAM antes da implementação.**

- [ ] T013 [P] [US2] Estender `tests/unit/analytics.test.ts` para `track` e `sanitize` de `src/ui/analytics.ts`:
  - (a) `track("trocar_tema", { tema: "claro" })` adiciona ao `dataLayer` um item cujo `Array.from(item)` é `["event", "trocar_tema", { tema: "claro" }]`;
  - (b) `sanitize` mantém números finitos e textos que casam com `^[a-z0-9_,-]{1,100}$`, e descarta `NaN`, `Infinity`, textos com espaço, maiúscula, acento, `.` ou `/`, textos com mais de 100 caracteres, objetos e `undefined`. Usar casos como `"EMPRESA FICTICIA"`, `"remessa.rem"`, `"a".repeat(101)` e `{}`;
  - (c) com `track` chamado via `as never` com `{ arquivo: "x.rem" }`, o parâmetro não chega ao `dataLayer`;
  - (d) se `window.dataLayer.push` lançar, `track` não lança;
  - (e) `track` antes de `initAnalytics` não lança e deixa o evento no `dataLayer` (criado sob demanda).
- [ ] T014 [P] [US2] Criar `tests/component/Footer.analytics.test.tsx` (parte dos links), no padrão de `tests/component/Footer.feedback.test.tsx`: com `window.dataLayer = []`, clicar em `manual-link` e `feedback-link` (com `fireEvent.click`) gera exatamente os eventos `abrir_manual` e `abrir_feedback`, sem parâmetros. O `href`, o `target` e o `rel` dos dois links continuam os do contrato da 004.
- [ ] T015 [P] [US2] Criar `tests/e2e/analytics.spec.ts` (modo `e2e`, 3 navegadores) com o helper local `events(page)`, igual a `page.evaluate(() => (window.dataLayer ?? []).map(e => Array.from(e as ArrayLike<unknown>)).filter(e => e[0] === "event").map(e => ({ name: e[1], params: e[2] ?? {} })))`, e o seguinte `beforeEach`:
  - registrar `page.on("request")`, falhando o teste se alguma URL casar com `/google|googletagmanager/`;
  - `page.goto("/")`.

  Um teste por grupo, comparando a lista de eventos com `toEqual` na ordem exata (US2, cenário 4):
  - (a) `importFile(page, golden("valid/pagamento-remessa.rem"))` gera um `importar_arquivo` com `{ resultado: "concluida", extensao: "rem", layout: "cnab240", direcao: "remessa", linhas: <total de linhas do arquivo> }`. Importar um `.pdf` via `importBuffer` gera `{ resultado: "erro", motivo: "extensao", extensao: "outra", layout: "cnab240" }`.
  - (b) `paste` + `paste-cancel` gera `colar_conteudo {resultado:"cancelada"}`, e `pasteContent` gera `colar_conteudo {resultado:"concluida", layout:"cnab240", direcao, linhas}`.
  - (c) Com conteúdo no quadro e alterações, importar outro arquivo e escolher `replace-cancel` gera `importar_arquivo` seguido de `substituir_conteudo {resultado:"cancelada", origem:"arquivo"}`; repetir com `replace-confirm` gera `{resultado:"confirmada", origem:"arquivo"}`.
  - (d) Linha 3: alterar `valorPagamento`, `update-line` gera `atualizar_linha {tipo_registro:"detalhe", segmento:"a", servico:<sufixo do header de lote do golden, por exemplo "pagamento">, campos_alterados:1, com_erros:"nao"}`. Alterar de novo e `discard` gera `descartar_edicao {tipo_registro:"detalhe"}`. Alterar de novo e clicar em outra linha abre o diálogo; `pending-cancel` gera `edicoes_pendentes {escolha:"cancelar"}`.
  - (e) `recalc` gera `recalcular_totais` com `campos_alterados` e `erros` numéricos. Com um golden de `invalid/`, clicar no contador `error-count` (em `MainPane.tsx`) gera `proximo_erro {erros:<total>}`.
  - (f) `export` até o download gera `exportar_arquivo {resultado:"concluida", extensao:"rem", com_erros:"nao", erros:0, linhas}`. Com um golden de `invalid/`, `export` + `export-cancel` gera `{resultado:"cancelada", com_erros:"sim", ...}`. Com o mesmo golden de `invalid/`, `export` + `export-confirm` até o download gera `exportar_arquivo {resultado:"concluida", extensao:"rem", com_erros:"sim", erros:<total>, linhas}` (US2, cenário 3). `copy` gera `copiar_conteudo {resultado:"concluida", linhas}`.
  - (g) `generate` gera `abrir_gerador {origem:"cabecalho"}`, `generate-empty` gera `{origem:"quadro_vazio"}`, `generator-cancel` gera `gerar_massa {resultado:"cancelada", ...}`, e gerar com `segmento-a-pagamento` e banco `033` (como em `privacy.spec.ts`) gera `gerar_massa {resultado:"concluida", layout:"cnab240", direcao:"remessa", variantes:"segmento-a-pagamento", qtd_variantes:1, qtd_registros:<quantidade padrão da variante>, com_conta_empresa:"nao", linhas:14}`.
  - (h) `theme-toggle` gera `trocar_tema {tema:"claro"}` e `wrap-toggle` gera `alternar_quebra {quebra:"desligada"}`.
  - (i) Auditoria (SC-002): executar o roteiro completo de (a), (d), (e), (f) e (g). Depois, `JSON.stringify` do `dataLayer` não pode conter o nome do arquivo `pagamento-remessa`, `EMPRESA FICTICIA`, o valor digitado `999`, nem nenhum trecho de 8 ou mais caracteres não brancos de qualquer linha do golden (iterar sobre `goldenText(...)` dividido em linhas e em tokens `/\S{8,}/g`). Todo valor de texto dos params deve casar com `^[a-z0-9_,-]{1,100}$`.

### Implementation for User Story 2

- [ ] T016 [US2] Em `src/ui/analytics.ts`:
  - acrescentar os tipos `Direcao = "remessa" | "retorno" | "desconhecida"`, `TipoRegistro = "header_arquivo" | "header_lote" | "detalhe" | "trailer_lote" | "trailer_arquivo" | "desconhecido"`, `Layout = "cnab240"` e `Servico` (união literal dos sufixos de `header-lote-*.json` em `src/layouts/febraban-cnab240-v10.11/`, mais `"geral"` e `"nenhum"`);
  - acrescentar `export interface AnalyticsEvents` com uma chave por evento e os parâmetros exatamente como no `contracts/analytics-events.md`. Parâmetros opcionais ficam com `?`; eventos sem parâmetros têm `Record<string, never>`;
  - implementar `export function sanitize(params: Record<string, unknown>): Record<string, string | number>`, com a regra "número finito ou texto que case com `^[a-z0-9_,-]{1,100}$`; o resto é descartado";
  - implementar `export function track<K extends keyof AnalyticsEvents>(name: K, ...[params]: AnalyticsEvents[K] extends Record<string, never> ? [] : [AnalyticsEvents[K]]): void`, que, dentro de `try/catch` vazio, chama `gtag("event", name, sanitize(params ?? {}))`, usando a função `gtag` de nível de módulo criada em T010. Não acessar `dataLayer` diretamente;
  - acrescentar o helper exportado `servico(rec: CnabRecord, records: CnabRecord[]): Servico`, que pega o header de lote do lote da linha (via `rec.batchContext`; conferir o formato em `src/core/types.ts`) e devolve o sufixo do `definitionId` dele, depois de `header-lote-` (`geral` se for exatamente `header-lote`, `nenhum` sem lote). Se o sufixo não estiver na união `Servico`, devolver `nenhum`;
  - acrescentar os helpers exportados `direcao(d: Direction): Direcao` e `tipoRegistro(rec: CnabRecord): { tipo_registro: TipoRegistro; segmento?: string }`, que derivam o tipo de `rec.definitionId`: prefixo `header-arquivo`, `header-lote` ou `saldo-inicial-` (header de lote), `segmento-<x>` (detalhe, com `segmento` = `<x>` em minúscula), `trailer-lote` ou `saldo-final-` (trailer de lote), `trailer-arquivo`, senão `desconhecido`. Conferir no `layout.json` e no `saldo-*.json` de `src/layouts/febraban-cnab240-v10.11/` que o tipo de registro (posição 8) de `saldo-inicial`/`saldo-final` é 1/5; se não for, ajustar o mapeamento.

  Faz T013 passar.
- [ ] T017 [US2] Em `src/ui/state/document.ts`:
  - em `loadFromFile`, chamar `track("importar_arquivo", …)` uma vez, em cada saída:
    - extensão recusada: `resultado:"erro", motivo:"extensao", extensao:"outra"`;
    - falha de leitura: `resultado:"erro", motivo:"leitura"` e a extensão;
    - sucesso: `resultado:"concluida"`, extensão em minúscula (`rem`, `ret` ou `txt`), `layout: "cnab240"`, `direcao(next.direction)` e `linhas: next.records.length`, antes de `replaceOrConfirm`.

    Nos dois casos de erro, enviar também `layout: "cnab240"`;

    A extensão sai do sufixo depois do último `.`, mapeado para a união fechada, nunca do nome inteiro;
  - em `loadFromPaste`, `track("colar_conteudo", { resultado: "concluida", layout: "cnab240", direcao, linhas })`;
  - em `recalculate`, `track("recalcular_totais", { campos_alterados: changes.length, erros: errors.length })`;
  - acrescentar `origem: "arquivo" | "colagem" | "gerador"` a `ReplaceRequest`, preencher nas três chamadas de `replaceOrConfirm`, e emitir `track("substituir_conteudo", { resultado: "confirmada" | "cancelada", origem })` em `confirmReplace` e em `cancelReplace`, só quando havia pedido pendente.
- [ ] T018 [P] [US2] Em `src/ui/state/editSession.ts`:
  - em `updateLine`, depois de aplicar, `track("atualizar_linha", { ...tipoRegistro(rec), servico: servico(rec, d.records), campos_alterados, com_erros: errors.length ? "sim" : "nao" })`. `campos_alterados` é a quantidade de ids em que `s.values[id] !== s.baseline[id]`, calculada antes de `openSession`;
  - em `discard`, quando houver sessão, `track("descartar_edicao", { tipo_registro: tipoRegistro(doc.value!.records[s.recordIndex]).tipo_registro })`.
- [ ] T019 [P] [US2] Em `src/ui/state/export.ts`:
  - em `advance`, logo depois de `download(...)` bem-sucedido, `track("exportar_arquivo", { resultado: "concluida", extensao: pending.ext, com_erros, erros, linhas: d.records.length })`. Guardar `errorCount()` em `pending.errors` na primeira passagem, para não validar de novo;
  - em `cancelExport`, se havia `pending`, emitir `resultado: "cancelada"` com `extensao: pending.ext ?? "indefinida"`;
  - para emitir o evento uma única vez em `copyToClipboard`, renomear o corpo atual para `writeClipboard(d)` e fazer `copyToClipboard` chamar `const ok = await writeClipboard(d); track("copiar_conteudo", { resultado: ok ? "concluida" : "erro", linhas: d.records.length }); return ok;`.
- [ ] T020 [P] [US2] Em `src/ui/state/generator.ts`:
  - `openGenerator(origem: "cabecalho" | "quadro_vazio" = "cabecalho")` emite `track("abrir_gerador", { origem })`;
  - `closeGenerator`, quando não está rodando, emite `gerar_massa` com `resultado: "cancelada"`;
  - em `onResult`, com erro, emite `resultado: "erro"`; quando a massa entra no quadro (dentro do callback `onReplaced` passado a `loadGenerated`), emite `resultado: "concluida"` e `linhas: msg.lines`.

  Parâmetros comuns, calculados por um helper local `genParams()` a partir de `config.value`:
  - `layout: "cnab240"`;
  - `direcao`;
  - `variantes`: ids das seleções ordenados, unidos por `,` e cortados em 100 caracteres;
  - `qtd_variantes`;
  - `qtd_registros`: soma das quantidades de `config.value.selections` (conferir o nome do campo de quantidade em `Selection`, em `src/core/generate/selection.ts`);
  - `com_conta_empresa`: `"sim"` se algum valor de `companyAccount.value` não for vazio.

  Nunca enviar `bankCode`.
- [ ] T021 [P] [US2] Em `src/ui/state/validation.ts`, em `goToNextError`, depois da guarda `if (!errors.length) return;`, chamar `track("proximo_erro", { erros: errors.length })`.
- [ ] T022 [US2] Componentes (depende de T016 e T020):
  - Em `src/ui/components/Header.tsx`:
    - o botão `generate` passa a chamar `() => openGenerator("cabecalho")`;
    - o `theme-toggle` chama `track("trocar_tema", { tema: dark ? "claro" : "escuro" })` antes de `setPrefs`.
  - Em `src/ui/components/MainPane.tsx`:
    - `generate-empty` chama `() => openGenerator("quadro_vazio")`;
    - `wrap-toggle` chama `track("alternar_quebra", { quebra: wrap ? "desligada" : "ligada" })`.
  - Em `src/ui/components/dialogs/PasteDialog.tsx`, o botão `paste-cancel` e o `onCancel` do `Dialog` chamam uma função `cancel` que emite `track("colar_conteudo", { resultado: "cancelada" })` e fecha; `confirm` continua usando `close` sem evento.
  - Em `src/ui/components/dialogs/PendingEditsDialog.tsx`:
    - `cancel` emite `edicoes_pendentes {escolha:"cancelar"}`;
    - `proceed(discard)` emite `escolha:"descartar"` e `proceed(updateLine)` emite `escolha:"atualizar"` antes de `before()`.
  - Em `src/ui/components/Footer.tsx`, `onClick={() => track("abrir_manual")}` no `manual-link` e `onClick={() => track("abrir_feedback")}` no `feedback-link`, sem `preventDefault`.
- [ ] T023 [US2] Rodar `npm run test`, `npm run lint`, `npx tsc --noEmit` e `npx playwright test tests/e2e/analytics.spec.ts`: tudo verde (quickstart Q3, Q4). Ajustar os valores esperados de `linhas` e `erros` em T015 aos reais dos golden files, sem afrouxar a auditoria (i).

**Checkpoint**: todas as ações do catálogo aparecem no `dataLayer`, e a auditoria SC-002 passa.

---

## Phase 4: User Story 3 - Usuário informado sobre a medição (Priority: P3)

**Goal**: o rodapé avisa que o uso é medido de forma anônima e que o conteúdo dos arquivos nunca sai do navegador, sem banner nem recusa (FR-009, FR-010).

**Independent Test**: `npx vitest run tests/component/Footer.analytics.test.tsx` verde, e o aviso visível em 375 px nos dois temas (quickstart Q1).

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Em `tests/component/Footer.analytics.test.tsx`, acrescentar:
  - (a) `screen.getByTestId("analytics-notice")` existe dentro de `.footer-meta`, logo depois de `.local-only`, com o texto visível `"Uso do site medido de forma anônima"`;
  - (b) `title` é `"Usamos o Google Analytics para contar visitas e ações. O conteúdo dos arquivos nunca sai do seu navegador."`, e o `aria-describedby` aponta para um elemento com esse mesmo texto;
  - (c) o aviso existe com documento vazio e com documento carregado;
  - (d) `.local-only` continua com o texto `"Processado só no seu navegador"`;
  - (e) não existe nenhum `role="dialog"` nem botão com o texto "Recusar" ou "Aceitar" no documento renderizado por `<App />` (FR-009).
- [ ] T025 [P] [US3] Em `tests/e2e/analytics.spec.ts`, acrescentar o teste "aviso em tela estreita": viewport 375×800, nos temas escuro e claro (via `theme-toggle`). `analytics-notice` está visível dentro de `app-footer`, e `document.documentElement.scrollWidth` não passa do valor medido antes desta feature (o cabeçalho já alarga a página; ver T002 da 004).

### Implementation for User Story 3

- [ ] T026 [US3] Em `src/ui/components/Footer.tsx`:
  - acrescentar as constantes `ANALYTICS_NOTICE = "Uso do site medido de forma anônima"` e `ANALYTICS_DETAIL = "Usamos o Google Analytics para contar visitas e ações. O conteúdo dos arquivos nunca sai do seu navegador."`;
  - logo depois do `<span class="local-only">`, renderizar `<span data-testid="analytics-notice" title={ANALYTICS_DETAIL} aria-describedby="analytics-detail">{ANALYTICS_NOTICE}<span id="analytics-detail" class="visually-hidden">{ANALYTICS_DETAIL}</span></span>`. A classe `visually-hidden` já existe, usada em `PasteDialog.tsx`;
  - não adicionar CSS novo;
  - atualizar o comentário do componente para `/** Rodapé (FR-004, FR-027, FR-028; 004: link de feedback; 005: aviso de medição). */`.
- [ ] T027 [US3] Rodar `npx vitest run tests/component/Footer.analytics.test.tsx tests/component/Footer.feedback.test.tsx` e `npx playwright test tests/e2e/analytics.spec.ts tests/e2e/feedback.spec.ts`: verdes.

**Checkpoint**: as três histórias estão completas.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T028 [P] Em `README.md`, acrescentar a seção "Medição de uso" depois de "Rodando a aplicação", com estes pontos:
  - o build publicado (`npm run build`) usa o Google Analytics (`G-TKLBD459FS`) só para visitas e ações, sem conteúdo de arquivos;
  - dev, Vitest e Playwright (`--mode e2e`) não carregam o script;
  - a CSP de produção é gerada por `src/build/csp.ts`;
  - o catálogo de eventos está em `specs/005-google-analytics/contracts/analytics-events.md`.

  Ajustar a frase "O conteúdo dos arquivos nunca é enviado a um servidor nem gravado no navegador" para deixar explícito que isso continua valendo, e que só dados de uso anônimos são medidos. Na seção de testes, listar o projeto `analytics-prod`.
- [ ] T029 [P] Rodar `npm run test:perf` (mediana de 3 execuções) e comparar com `specs/005-google-analytics/perf-baseline.md` (T003): cada tempo pode subir no máximo 5% (SC-004). Registrar as duas tabelas no PR.
- [ ] T030 Rodar a suíte completa: `npm run lint`, `npm run test`, `npm run test:golden`, `npm run test:e2e` (inclui `analytics-prod`), `npm run validate:layout` e `npm run build`. Tudo verde. Conferir `git status`: nenhum `dist-prod/` versionado.
- [ ] T031 Antes do primeiro deploy, manual, pelo criador do site: aplicar o quickstart Q7 na propriedade `G-TKLBD459FS`: medição aprimorada sem interações com formulários nem pesquisa no site; retenção de 2 meses; sinais do Google desativados; dimensões personalizadas, incluindo `layout`, `servico` e a métrica `qtd_registros`. **Bloqueia a publicação** (research A12).
- [ ] T032 Depois do deploy, manual, pelo criador do site: executar o quickstart Q6 (tempo real e DebugView, SC-001).

---

## Dependencies & Execution Order

- **Setup (T001, T002, T003)** vem antes de tudo. T001 garante que nenhum E2E envie dados à propriedade quando o script passar a existir. T003 precisa rodar antes de qualquer instrumentação (T010 em diante).
- **US1 (T004–T012)** depende do Setup e é o MVP.
- **US2 (T013–T023)** depende de T010, porque `track` estende `src/ui/analytics.ts`.
- **US3 (T024–T027)** depende só do Setup e pode rodar em paralelo com US1 e US2. Toca `Footer.tsx`, como T022: fazer T022 e T026 em sequência para evitar conflito.
- **Gate de publicação**: nenhum deploy do build de produção antes de US1 **e** US3 estarem completas (FR-010: a medição nunca fica ativa sem o aviso no rodapé) **e** de a configuração do painel (T031) estar aplicada (research A12). T032 só roda depois do deploy.
- **Polish (T028–T032)** depois das três histórias. T031 é manual e bloqueia o deploy; T032 só roda depois dele.

Dentro de cada história: testes (falhando) → implementação → verificação.

## Parallel Opportunities

- Setup: T002 e T003 em paralelo com T001.
- US1: T004, T005 e T006 em paralelo; T008 em paralelo com T010.
- US2: T013, T014 e T015 em paralelo; depois de T016 e T017, T018, T019, T020 e T021 tocam arquivos diferentes e podem rodar em paralelo.
- US3: T024 e T025 em paralelo; US3 inteira em paralelo com US2, exceto `Footer.tsx`.
- Polish: T028 e T029 em paralelo.

## Implementation Strategy

1. **MVP (primeira publicação)**: Setup + US1 + US3. A propriedade passa a registrar visitas do site publicado, com CSP mínima, testes isolados e o aviso no rodapé desde o primeiro deploy. US3 é obrigatória no MVP, e não um incremento posterior (FR-010).
2. **Incremento 2**: US2. Eventos por ação, com auditoria automática de dados.
3. Polish e validação manual na propriedade.
