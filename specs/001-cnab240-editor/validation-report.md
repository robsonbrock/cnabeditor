# Relatório de validação: Editor CNAB 240

**Data**: 2026-10-22 | **Ambiente**: Windows 11, Node.js 22.23.4, npm 10.9.9, Playwright (Chromium, Firefox, WebKit) | **Tarefa**: T099

## Comandos do quickstart

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ sem problemas |
| `npm run validate:layout` | ✅ 89 registros válidos contra o JSON Schema |
| `npm run build` | ✅ `dist/` gerado: JS 689 kB (94 kB gzip), Worker 637 kB |
| `npm run test` | ✅ 28 arquivos, 939 testes |
| `npm run test:golden` | ✅ 4 arquivos, 153 testes, incluindo o round-trip byte a byte de todos os 30 golden files (gate de merge) |
| `npm run test:e2e` | ✅ 105 testes: 35 cenários × 3 navegadores |
| `npm run test:perf` | ✅ 2 testes (Chromium) |

## Cenários manuais (quickstart.md) × evidência automatizada

| # | Cenário | Evidência | Situação |
|---|---|---|---|
| 1 | Importar remessa | `us1-load.spec.ts` "US1-1/11" | ✅ automatizado |
| 2 | Rótulos | `us1-load.spec.ts` "US1-5/5a"; `golden/parse.test.ts` | ✅ automatizado |
| 3 | Colar retorno com espaços finais e copiar | `us1-load.spec.ts` "US1-2"; `us4-export.spec.ts` "US4-4"; `golden/roundtrip.test.ts` (SC-005b) | ✅ texto entregue à área de transferência idêntico. **Colar num editor externo** não foi verificado; no Windows, o Chromium converte LF em CRLF ao gravar na área de transferência do sistema. |
| 4 | Quadro somente leitura | `us1-load.spec.ts` "US1-4"; `MainPane.test.tsx` | ✅ automatizado |
| 5 | Navegação por teclado | `us1-load.spec.ts` "US1-6/6a"; `MainPane.test.tsx` | ✅ automatizado |
| 6 | Painel de detalhes | `us2-detail.spec.ts` "US2-2" | ✅ automatizado |
| 7 | Validação por tecla | `us3-edit.spec.ts` "US3-1/1a/1b" | ✅ automatizado |
| 8 | Validação ao sair | `us3-edit.spec.ts` "US3-1/1a/1b" | ✅ automatizado |
| 9 | Atualizar linha | `us3-edit.spec.ts` "US3-3/9", "US3-1c/2" | ✅ automatizado |
| 10 | Edições pendentes | `us3-edit.spec.ts` "US3-4" | ✅ automatizado |
| 11 | Trailer divergente e recálculo | `us3-edit.spec.ts` "US3-6/7/10" | ✅ automatizado |
| 12 | Exportar sem edições | `us4-export.spec.ts` "US4-1/2", "FR-025" (bytes comparados) | ✅ automatizado |
| 13 | Exportar com erros | `us4-export.spec.ts` "US4-3" | ✅ automatizado |
| 14 | Colar com emoji e exportar | `us4-export.spec.ts` "FR-024/FR-025a/b" | ✅ automatizado |
| 15 | Preferências | `us5-prefs.spec.ts` | ✅ automatizado |
| 16 | Privacidade | `privacy.spec.ts` (zero requisições, CSP, storage) | ✅ automatizado |
| 17 | Desempenho | `perf.spec.ts` | ✅ automatizado |

**Pendente (humano):** passar visualmente pelos cenários no navegador (contraste dos temas, aparência dos indicadores e do esboço `attachments/esboco-quadro-edicao.svg`) e registrar o resultado no PR.

## Desempenho medido (Chromium, `npm run test:perf`)

| Meta | Resultado |
|---|---|
| 10.000 linhas carregadas e exibidas ≤ 3 s | ✅ dentro do limite |
| 100.000 linhas: rolagem, seleção, edição e "Atualizar linha" sem tarefa longa > 200 ms | ✅ nenhuma tarefa > 200 ms |

A primeira versão de "Atualizar linha" re-resolvia o arquivo inteiro e gerava uma tarefa de 348 ms com 100.000 linhas. O problema foi corrigido re-resolvendo só a linha editada, ou o lote quando o contexto muda (`resolveAround`, com testes em `tests/unit/resolve.test.ts`).

## Bugs encontrados na validação

| Bug | Correção | Teste de regressão |
|---|---|---|
| WebKit: Backspace com o foco no quadro principal voltava à página anterior e descartava o conteúdo | `MainPane` bloqueia Backspace | `MainPane.test.tsx`; `us1-load.spec.ts` "US1-4" (WebKit) |
| "Atualizar linha" lenta com 100.000 linhas (tarefa de 348 ms) | `resolveAround` | `resolve.test.ts`; `perf.spec.ts` |
