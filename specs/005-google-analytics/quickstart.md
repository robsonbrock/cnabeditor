# Quickstart: validação da Medição de Uso

Pré-requisitos: Node.js 22, `npm install`, `npx playwright install`.

## Q1. Testes automatizados (sem tocar na propriedade real)

```sh
npm run lint        # inclui a regra que restringe gtag/dataLayer a src/ui/analytics.ts
npm run test        # analytics.test.ts, csp.test.ts, Footer (aviso de medição)
npm run test:e2e    # analytics.spec.ts (modo e2e) + analytics-prod.spec.ts (produção, Google bloqueado)
npm run test:perf   # suíte de desempenho com a instrumentação ativa
```

Esperado: tudo verde. Os testes de privacidade da 001 continuam passando sem alteração.

## Q2. Nenhuma medição fora de produção (FR-002, SC-005)

1. Rode `npm run dev` e abra http://localhost:5173.
2. Nas DevTools, na aba Network, filtre por `google`: nenhuma requisição.
3. No Console, `window.dataLayer` mostra `js`, `config` e os eventos das ações executadas, só em memória.

## Q3. Eventos de cada ação (FR-005, US2)

Coberto por `tests/e2e/analytics.spec.ts`. Para conferir à mão, no modo dev:
1. Execute cada ação do [catálogo](contracts/analytics-events.md).
2. No Console, rode `dataLayer.filter(e => e[0] === 'event').map(e => e[1])`.

Esperado: um nome por execução, na ordem em que as ações foram feitas.

## Q4. Auditoria de dados (FR-007, SC-002)

Coberto pelo E2E:
1. Importe `tests/golden/febraban-cnab240-v10.11/valid/pagamento-remessa.rem`.
2. Edite um valor, recalcule, gere uma massa e exporte.
3. Rode `JSON.stringify(window.dataLayer)`.

Esperado: o texto não contém o nome do arquivo, nem `EMPRESA FICTICIA`, nem os documentos, contas ou valores do arquivo.

## Q5. Build de produção com o Google bloqueado (FR-003, FR-004, SC-003)

Coberto por `analytics-prod.spec.ts`. Para conferir à mão:
1. Rode `npm run build && npm run preview` e abra http://localhost:4173 com um bloqueador de anúncios ativo.
2. Importe, edite e exporte um arquivo.
3. No Elements, confira o `<meta http-equiv="Content-Security-Policy">`.

Esperado: o editor funciona normalmente, sem erro visível. A CSP é a de produção do [ui-contract](contracts/ui-contract.md), e o Console só mostra o bloqueio do gtag.js pelo bloqueador.

## Q6. Chegada na propriedade (SC-001), manual e só depois de publicar

1. Abra o site publicado sem bloqueador.
2. No Google Analytics da propriedade `G-TKLBD459FS`, vá em **Relatórios → Tempo real**: a visita aparece em até 1 minuto.
3. Execute cada ação do catálogo. Em **Administrador → DebugView**, ou em Tempo real → "Contagem de eventos por nome do evento", cada evento aparece com seus parâmetros.

## Q7. Configuração recomendada no painel do GA (fora do código, research A12)

- **Administrador → Fluxos de dados → Web → Medição aprimorada**: manter visualizações de página, rolagem e cliques de saída; **desativar** interações com formulários e pesquisa no site.
- **Administrador → Coleta de dados → Retenção de dados**: 2 meses.
- **Administrador → Sinais do Google**: desativado (o código já envia `allow_google_signals: false`).
- **Administrador → Definições personalizadas**: criar dimensões para `resultado`, `direcao`, `origem`, `tipo_registro`, `extensao`, `layout` e `servico`, e métricas para `linhas`, `erros` e `qtd_registros`, para usá-las nos relatórios.
- **Filtros de dados**: filtrar o tráfego interno pelo IP do criador, se desejado.
