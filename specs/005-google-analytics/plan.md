# Implementation Plan: Medição de Uso com Google Analytics

**Branch**: `005-google-analytics` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-google-analytics/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

O site publicado passa a medir visitas e as ações do usuário na propriedade do Google Analytics `G-6QQBTELE2T`. A medição fica sempre ativa e é informada no rodapé, sem consentimento (opção C), e nunca leva dados dos arquivos.

**Abordagem técnica**:
- **Carregamento**: um módulo `src/ui/analytics.ts` reproduz a tag fornecida (`dataLayer`, `gtag('js')`, `gtag('config')`) e injeta o gtag.js `async`. O script só entra no build `production`. Dev, Vitest e Playwright (`--mode e2e`) mantêm o `dataLayer` só em memória.
- **CSP**: um plugin do Vite troca a CSP apenas no build de produção e libera só os domínios do GA4 em `script-src`, `connect-src` e `img-src`. Nos outros modos a CSP continua com `connect-src 'none'`.
- **Eventos**: `track(name, params)` aceita um catálogo fechado e tipado de 16 eventos. Os parâmetros são só números e enums, e um filtro em tempo de execução descarta qualquer outro valor. Os eventos são emitidos nas funções de estado de cada ação.
- **Rodapé**: novo aviso "Uso do site medido de forma anônima", ao lado de "Processado só no seu navegador".

Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (target ES2022); Node.js 22 só para build e testes.

**Primary Dependencies**: as da feature 001 (Preact 10 + @preact/signals, Vite 6; dev: Vitest 3, happy-dom, @testing-library/preact, Playwright). **Nenhuma dependência npm nova.** Dependência de runtime externa: o gtag.js, servido por `www.googletagmanager.com` e carregado só em produção.

**Storage**: N/A no editor. O gtag.js grava os próprios cookies (`_ga`, `_ga_*`) em produção. A preferência de interface em `localStorage` não muda.

**Testing**:
- Vitest: `analytics.test.ts` (injeção do script, config, filtro, resiliência), `csp.test.ts` e o componente Footer (aviso).
- Playwright:
  - `analytics.spec.ts`, em modo `e2e` nos 3 navegadores: um evento por ação, nenhuma requisição ao Google e auditoria de dados.
  - `analytics-prod.spec.ts`, em modo `production`, só Chromium, com o Google bloqueado por `page.route`: script pedido com o ID, CSP de produção e editor funcionando.

**Target Platform**: navegadores desktop modernos, os mesmos da 001; publicação estática.

**Project Type**: aplicação web estática de página única (client-only), a mesma da 001.

**Performance Goals**: SC-004, no máximo +5% em abrir, validar e exportar 100.000 linhas. `track` é um `push` síncrono em array, e a suíte `@perf` roda com a instrumentação ativa. O gtag.js é `async` e é injetado depois do `render`.

**Constraints**:
- Nenhum dado do arquivo em eventos, título ou endereço (FR-007).
- Medição só no build de produção (FR-002).
- CSP mínima por modo (FR-004).
- Falha do Google não afeta o editor (FR-003).

**Scale/Scope**:
- 1 módulo novo e 1 plugin de build;
- cerca de 6 módulos de estado e 4 componentes instrumentados;
- 16 eventos;
- 2 specs E2E novos e 1 projeto Playwright novo.

Nenhum NEEDS CLARIFICATION pendente: o consentimento foi resolvido na spec (FR-009, opção C), e as decisões técnicas estão em [research.md](research.md), A1–A13.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Pré-pesquisa | Pós-design | Evidência |
|---|---|---|---|
| **I. Layout como Dado** | ✅ Não toca layout | ✅ `tipo_registro`, `segmento` e `variantes` saem da definição de layout já resolvida, sem posições novas no código | [contracts/analytics-events.md](contracts/analytics-events.md) |
| **II. Round-Trip sem Perdas** | ✅ Não toca o conteúdo | ✅ `track` só lê contagens e enums; não altera documento nem exportação. Golden files e round-trip inalterados | research A6 |
| **III. Validação Explícita** | ✅ N/A | ✅ N/A. Só conta erros (`erros`) e não envia o texto das mensagens | contrato |
| **IV. Test-First** | ✅ | ✅ Testes de unidade, componente e E2E escritos antes da instrumentação; nenhum golden file novo, porque nenhum layout muda | quickstart Q1–Q5 |
| **V. Privacidade e Processamento Local** | ⚠️ Dados de uso saem do navegador para o Google; o script de terceiro roda na página | ✅ com risco registrado. Nenhum conteúdo de arquivo é enviado: catálogo tipado sem texto livre, filtro em tempo de execução, título e endereço fixos, auditoria E2E (SC-002). O usuário é informado no rodapé (FR-010). Medição só em produção. O risco residual do script de terceiro está em Complexity Tracking | research A4, A5, A8, A10 |
| **Restrições** (YAGNI, desempenho) | ⚠️ Nova dependência de runtime externa | ✅ Sem GTM, Partytown ou pacote npm novo; 1 plugin de cerca de 15 linhas; suíte `@perf` como gate de SC-004 | research A9 |

**Resultado**: PASS, com justificativas em Complexity Tracking. O Princípio V proíbe enviar *conteúdo de arquivo* sem consentimento, e o design garante que nenhum conteúdo sai. A medição de uso sem conteúdo, com aviso, foi decisão explícita do criador (spec, Assumptions).

**Nota para revisão**: o SC-008 e o FR-033 da feature 001 ("nenhuma requisição de rede") passam a valer para o *conteúdo do editor* e para os modos não produtivos. O build publicado agora faz requisições de medição. Os testes de privacidade da 001 continuam verdes porque rodam em modo `e2e`. O README deve ser atualizado com essa ressalva.

## Project Structure

### Documentation (this feature)

```text
specs/005-google-analytics/
├── plan.md                    # Este arquivo
├── research.md                # Fase 0: decisões A1–A13
├── data-model.md              # Fase 1: AnalyticsConfig, AnalyticsEvent (só em memória)
├── quickstart.md              # Fase 1: cenários de validação Q1–Q7
├── contracts/
│   ├── analytics-events.md    # Fase 1: catálogo fechado de eventos e parâmetros
│   └── ui-contract.md         # Fase 1: aviso no rodapé, CSP por modo, script do Google
├── checklists/
│   └── requirements.md
└── tasks.md                   # Fase 2 (/speckit-tasks; não criado aqui)
```

### Source Code (repository root)

```text
index.html                          # (sem mudança: CSP base de dev/e2e)
vite.config.ts                      # + plugin que aplica analyticsCsp() no build production
eslint.config.js                    # + gtag/dataLayer restritos a src/ui/analytics.ts
playwright.config.ts                # webServer em --mode e2e; + webServer production (4174) e projeto analytics-prod
README.md                           # + seção "Medição de uso"

src/
├── main.tsx                        # + initAnalytics() depois do render
├── build/
│   └── csp.ts                      # novo: analyticsCsp(base) — função pura usada pelo plugin e testada
└── ui/
    ├── analytics.ts                # novo: initAnalytics, track, sanitize, tipo AnalyticsEvents
    ├── state/
    │   ├── document.ts             # importar_arquivo, colar_conteudo, substituir_conteudo, recalcular_totais
    │   ├── editSession.ts          # atualizar_linha, descartar_edicao
    │   ├── export.ts               # exportar_arquivo, copiar_conteudo
    │   ├── generator.ts            # abrir_gerador, gerar_massa
    │   └── validation.ts           # proximo_erro
    └── components/
        ├── Footer.tsx              # + analytics-notice; onClick em manual-link e feedback-link
        ├── Header.tsx              # trocar_tema; origem do abrir_gerador
        ├── MainPane.tsx            # alternar_quebra; origem do abrir_gerador
        └── dialogs/
            ├── PasteDialog.tsx         # colar_conteudo cancelada
            └── PendingEditsDialog.tsx  # edicoes_pendentes

tests/
├── unit/
│   ├── analytics.test.ts           # novo
│   └── csp.test.ts                 # novo
├── component/
│   └── Footer.analytics.test.tsx   # novo: aviso e eventos dos links
└── e2e/
    ├── analytics.spec.ts           # novo: modo e2e, 3 navegadores
    └── analytics-prod.spec.ts      # novo: modo production, Chromium, Google bloqueado
```

**Structure Decision**: aplicação única já existente (feature 001). O módulo de medição fica em `src/ui/`, ao lado de `prefs.ts`, porque é infraestrutura de interface e não toca `src/core`. A função de CSP fica em `src/build/` para ser importável tanto pelo `vite.config.ts` quanto pelos testes. A regra de lint `noNetwork` continua valendo, porque nenhum código do bundle faz requisição: quem envia é o gtag.js.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Script de terceiro (gtag.js) executado na página que exibe dados financeiros, sem SRI possível (Princípio V, risco residual) | É a ferramenta pedida pelo criador, a única forma oficial de usar GA4 no navegador | GTM amplia quem pode injetar scripts; Partytown exige dependência e proxy; Measurement Protocol exige segredo no cliente (research A9, A10) |
| CSP de produção abre `script-src`, `connect-src` e `img-src` para domínios do Google (antes `connect-src 'none'`) | Sem isso o gtag.js não carrega nem envia (FR-004) | `'unsafe-inline'` ou CSP única para todos os modos afrouxa mais do que o necessário (research A1, A3) |
| Segundo build e servidor no Playwright (`dist-prod`, porta 4174) | Única forma automatizada de verificar CSP de produção, injeção do script e resiliência com o Google bloqueado (FR-003, FR-004) sem enviar dados à propriedade real | Testar só em modo `e2e` não exercita a CSP de produção nem o carregamento do script |
