# Research: Medição de Uso com Google Analytics

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-23

## A1. Como carregar a tag sem quebrar a CSP

**Decision**: a tag fornecida não é colada no `index.html`. Um módulo próprio, `src/ui/analytics.ts`, faz o mesmo que ela:
1. cria `window.dataLayer`;
2. define `gtag()`;
3. chama `gtag('js', new Date())` e `gtag('config', 'G-6QQBTELE2T', …)`;
4. injeta `<script async src="https://www.googletagmanager.com/gtag/js?id=G-6QQBTELE2T">`.

O módulo é chamado uma vez em `src/main.tsx`, logo depois do `render` (A7).

**Rationale**: a CSP atual (`script-src 'self'`) bloqueia o `<script>` embutido da tag. Liberar `'unsafe-inline'` ou usar um hash abriria a página inteira para scripts embutidos. Um módulo do próprio bundle já passa por `script-src 'self'`, de modo que só o domínio do gtag.js precisa entrar na CSP.

**Alternatives considered**:
- Colar a tag com `'unsafe-inline'`: enfraquece a CSP para qualquer injeção.
- Colar a tag com o hash `sha256-…` do bloco: funciona, mas qualquer mudança de espaço quebra o hash, e o ID e a configuração ficam fora do TypeScript e dos testes.
- Google Tag Manager, Partytown ou Measurement Protocol: veja A9.

## A2. Medir só no site publicado (FR-002)

**Decision**: o script do Google só é injetado quando `import.meta.env.MODE === "production"`, que é o modo padrão do `vite build`, usado para publicar. Nos outros ambientes:

| Ambiente | Modo | Script do Google | `dataLayer` |
|---|---|---|---|
| `npm run dev` | `development` | não | sim |
| Vitest | `test` | não | sim |
| Playwright (E2E e perf) | `e2e`, via `npm run build -- --mode e2e` no `webServer` | não | sim |
| `npm run build` (publicação) | `production` | **sim** | sim |

O `dataLayer` e o `gtag()` existem em todos os modos. Sem o script do Google, o `dataLayer` é só um array em memória que nunca sai do navegador. Isso permite que os testes auditem cada evento sem nenhuma requisição externa (A8).

**Rationale**: o `.gitignore` ignora `.env*`, e o ID de medição é público (aparece no HTML de qualquer site que usa GA), então a checagem por modo no código é mais simples e versionada. O E2E hoje roda sobre o build de produção (`npm run build && npm run preview`). Sem um modo próprio, cada execução da suíte enviaria visitas falsas à propriedade.

**Alternatives considered**:
- Checar o `hostname`: o domínio de publicação não está definido no repositório e mudaria o código a cada troca de host.
- Bloquear o Google com `page.route` em todos os testes: protege a propriedade, mas depende de lembrar o bloqueio em cada spec e não cobre `npm run preview` aberto à mão.
- Variável `VITE_GA_ID` em `.env.production`: o arquivo é ignorado pelo git, e o build publicado poderia sair sem medição em silêncio.

## A3. CSP gerada por modo (FR-004)

**Decision**: o `index.html` continua com a CSP atual. Um plugin de poucas linhas no `vite.config.ts` (`transformIndexHtml`, aplicado só em `build` com `mode === "production"`) troca a CSP pela versão com os domínios do Google Analytics, seguindo o guia oficial de CSP do Google para GA4:

| Diretiva | Atual | Produção |
|---|---|---|
| `script-src` | `'self'` | `'self' https://*.googletagmanager.com` |
| `connect-src` | `'none'` | `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` |
| `img-src` | `'self' data: blob:` | `'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com` |
| demais | — | inalteradas |

A função que monta a CSP é exportada (`analyticsCsp(base)`) para o teste unitário verificar exatamente o que muda.

**Rationale**: em dev e no E2E, `connect-src 'none'` continua valendo, e o teste de privacidade existente (`privacy.spec.ts`, SC-008 da 001) segue verdadeiro sem alteração. Só o build publicado abre exatamente os domínios necessários.

**Alternatives considered**:
- Uma CSP única com os domínios em todos os modos: afrouxa a garantia de dev e testes sem necessidade.
- CSP por cabeçalho HTTP: depende do host de publicação, que não está definido.

## A4. Configuração do `gtag('config')` (FR-001, FR-008)

**Decision**:

```text
gtag('config', 'G-6QQBTELE2T', {
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  page_title: 'CNAB Editor',
  page_location: location.origin + '/',
})
```

- `send_page_view` fica no padrão (`true`): uma visita por abertura do editor.
- `page_location` sem query string nem fragmento. Mesmo que alguém abra o site com parâmetros na URL, nada além da origem é enviado.
- `page_title` fixo, igual ao `<title>`.

**Rationale**: FR-008 pede sinais de publicidade desligados, e FR-007 pede título e endereço sem dados.

## A5. Catálogo fechado de eventos (FR-005, FR-006, FR-007)

**Decision**: `track(name, params)` só aceita os eventos de [contracts/analytics-events.md](contracts/analytics-events.md). O tipo TypeScript `AnalyticsEvents` mapeia cada nome para seus parâmetros, que só podem ser números ou literais de uma união fechada. Não existe parâmetro `string` livre.

Como defesa em profundidade, `track` também passa os parâmetros por um filtro em tempo de execução. Só entram números finitos e textos que casem com `^[a-z0-9_,-]{1,100}$`; o resto é descartado.

**Rationale**: a garantia de que nenhum nome de arquivo, valor ou documento sai do navegador fica no compilador, sem depender de revisão manual. O regex barra espaços, maiúsculas, acentos, pontos e barras, ou seja, nomes, nomes de arquivo e mensagens. Já CPF, CNPJ, valores e contas vêm como números ou dígitos, e o regex não os barraria. Quem os barra é o tipo: nenhum parâmetro do catálogo é texto livre, e os parâmetros numéricos só levam contagens. O filtro protege contra um `as any`; contra esses números, a proteção é o tipo e a revisão.

**Alternatives considered**: um `track(name, params: Record<string, unknown>)` genérico com revisão em PR. É fácil passar `fileName` por engano.

## A6. Onde instrumentar

**Decision**: os eventos são emitidos nas funções de estado (`src/ui/state/*.ts`) que executam cada ação, como `loadFromFile`, `updateLine`, `recalculate`, `startExport`/`cancelExport`/`advance`, `copyToClipboard`, `confirmReplace`/`cancelReplace`, `runGeneration`/`onResult` e `goToNextError`. Ficam nos componentes só as ações que não têm função de estado própria:
- tema e quebra de linha: `setPrefs` também é chamado pelo splitter;
- abertura do gerador, com a origem cabeçalho ou quadro vazio;
- links do manual e de feedback: `onClick` sem `preventDefault`.

**Rationale**: o atalho de teclado, o botão do cabeçalho e o botão do estado vazio passam pela mesma função. Instrumentar ali garante exatamente um evento por execução (US2, cenário 4).

## A7. Falha da medição não afeta o editor (FR-003)

**Decision**:
- O script é `async` e é injetado depois do `render`. O `onerror` é ignorado.
- `track` nunca lança exceção (`try/catch` em volta do `gtag`) e não retorna nada.
- Nada no editor espera a medição; não há `await`.

Bloqueadores, falta de rede e lentidão do Google só fazem o `dataLayer` crescer em memória, com algumas centenas de objetos pequenos por sessão.

## A8. Como testar sem enviar dados à propriedade

**Decision**:
- **Unidade (Vitest)**:
  - `analytics.test.ts`: script injetado só com `load: true` e com o `src` exato; `config` com os parâmetros de A4; filtro de A5; `track` não lança com `gtag` quebrado.
  - `csp.test.ts`: `analyticsCsp` altera só as três diretivas de A3.
- **E2E (modo `e2e`)**: `analytics.spec.ts`.
  - Cada ação de FR-005 gera exatamente um evento no `window.dataLayer`, com nome e parâmetros do contrato.
  - Nenhuma requisição a domínios do Google.
  - Auditoria (SC-002): depois de importar, editar, gerar e exportar um golden file, o `dataLayer` serializado não contém o nome do arquivo nem nenhum dos valores do arquivo (nomes, documentos, contas, valores).
- **E2E de produção**: o projeto Playwright `analytics-prod`, só Chromium, sobe um segundo servidor com `vite build --outDir dist-prod`, em modo `production`, na porta 4174.
  - Todas as requisições a `*.google*.com` e `*.googletagmanager.com` são abortadas com `page.route`, então nada chega à propriedade real.
  - O teste verifica que o gtag.js foi pedido com `id=G-6QQBTELE2T`, que a CSP de produção é a de A3, e que importar, editar e exportar funcionam com o Google bloqueado, sem mensagens de erro (SC-003).

**Rationale**: SC-001 (o evento aparece no relatório em tempo real) só é verificável manualmente no painel do GA; o [quickstart.md](quickstart.md), em Q6, descreve o roteiro. Todo o resto é automatizado sem tocar a propriedade.

## A9. Alternativas de arquitetura de medição rejeitadas

| Alternativa | Por que não |
|---|---|
| Google Tag Manager (contêiner) | Mais uma camada configurável fora do repositório, em que qualquer pessoa com acesso ao GTM pode injetar scripts na página que lê arquivos financeiros. A tag fornecida é a do gtag.js direto. |
| Partytown (gtag em Web Worker) | Dependência nova, que exige um proxy de serviço para funcionar com GA. O ganho de desempenho não se justifica para alguns eventos por sessão (YAGNI). |
| Measurement Protocol (enviar direto do código) | Exige um `api_secret` que não pode ficar no cliente. |
| Análise sem cookies própria (Plausible, Umami) | Muda a ferramenta pedida pelo usuário. |

## A10. Risco residual: script de terceiro na página

**Decision**: aceito e registrado no Complexity Tracking. O gtag.js roda na mesma página do editor e, em tese, poderia ler o DOM, onde o conteúdo do arquivo aparece. Não há SRI possível porque o Google atualiza o script sem versão.

As mitigações são:
- carregar só do domínio oficial, sem GTM (A9);
- não colocar dado do arquivo em atributos que o gtag coleta automaticamente: título fixo, `page_location` sem query, nenhum evento automático de formulário (veja Q7 do quickstart);
- documentar no rodapé e no README.

## A11. Aviso no rodapé (FR-010)

**Decision**: o texto atual "Processado só no seu navegador" continua, porque outros testes e o usuário já o conhecem. Ao lado entra um item `data-testid="analytics-notice"` com o texto "Uso do site medido de forma anônima" e com `title` e `aria-describedby`: "Usamos o Google Analytics para contar visitas e ações. O conteúdo dos arquivos nunca sai do seu navegador." O estilo reaproveita `.footer-meta`, e o item quebra linha pelo `flex-wrap` existente.

## A12. Medição aprimorada do GA (configuração no painel, fora do código)

**Decision**: recomendar no painel da propriedade:
- manter visualizações de página, rolagem e cliques de saída;
- desativar "interações com formulários" e "pesquisa no site";
- definir a retenção de dados em 2 meses;
- filtrar o tráfego interno.

Os eventos `abrir_manual` e `abrir_feedback` duplicam o clique de saída automático de propósito: o evento customizado tem nome estável para relatórios, e o automático depende de configuração no painel.

**Rationale**: as interações com formulários disparam `form_start`/`form_submit` nos diálogos (colar, gerador) com ids e nomes de formulário. São dados pouco úteis, e a medição manual (FR-005) já cobre essas ações.

## A13. Lint

**Decision**: nova regra `no-restricted-globals` para `gtag` e `dataLayer` em `src/**`, exceto em `src/ui/analytics.ts`. Todo envio passa por `track()` e pelo catálogo tipado. A regra `noNetwork` existente continua valendo: o módulo não usa `fetch`, porque quem envia é o gtag.js.
