# Quickstart: Editor CNAB 240

**Feature**: `001-cnab240-editor` | **Plan**: [plan.md](plan.md)

Guia de execução e validação ponta a ponta. Interfaces em [contracts/](contracts/); modelo em [data-model.md](data-model.md).

## Pré-requisitos

- Node.js 22 LTS e npm 10+
- Navegadores do Playwright (instalados no passo de setup)
- Windows, macOS ou Linux

## Setup

```sh
npm install
npx playwright install
```

## Rodar

```sh
npm run dev        # servidor de desenvolvimento (http://localhost:5173)
npm run build      # gera dist/ estático
npm run preview    # serve dist/ localmente para validação final
```

## Testes automatizados

```sh
npm run test             # Vitest: core, golden files, integridade de layout, componentes
npm run test:golden      # só golden files (parse, round-trip byte a byte, validação, recálculo)
npm run test:e2e         # Playwright: cenários de aceitação em Chromium, Firefox e WebKit
npm run test:perf        # Playwright: carga de 10k e 100k linhas
npm run lint             # ESLint (inclui proibição de trim no fluxo de conteúdo)
npm run validate:layout  # valida src/layouts/** contra contracts/layout-definition.schema.json
```

**Resultado esperado**: todas as suítes verdes. `test:golden` executa round-trip para todos os arquivos em `tests/golden/febraban-cnab240-v10.11/` (gate de merge da constituição).

## Cenários de validação manual

Arquivos fictícios de exemplo em `tests/golden/febraban-cnab240-v10.11/valid/`.

| # | Cenário | Passos | Resultado esperado | Ref. |
|---|---|---|---|---|
| 1 | Importar remessa | Importar `pagamento-remessa.rem` | Toast de sucesso com nome e total; indicador "Remessa"; "N linhas"; linha 1 selecionada com campos do Header de Arquivo | US1-1, US1-11 |
| 2 | Rótulos | Observar o início de cada linha | `HA`, `HL`, segmentos (`A`, `B`…), `TL`, `TA` separados do conteúdo | US1-5 |
| 3 | Colar retorno com espaços finais | "Colar conteúdo" → colar `cobranca-retorno.ret` (linhas com espaços finais) → confirmar → Copiar → colar num editor | Texto idêntico caractere a caractere; indicador "Retorno" | US1-2, SC-005b |
| 4 | Quadro somente leitura | Focar o quadro principal e digitar/apagar/colar | Nada muda | US1-4 |
| 5 | Navegação por teclado | Selecionar linha 3, pressionar ↓ | Linha 4 selecionada; na última linha ↓ não faz nada | US1-6a |
| 6 | Painel de detalhes | Focar "Tipo de Registro" de um detalhe | Opções 0–9 listadas; `3 – Detalhe` destacada | US2-2 |
| 7 | Validação por tecla | Digitar letra em campo numérico | Destaque + mensagem abaixo do campo imediatamente | US3-1 |
| 8 | Validação ao sair | Informar "8" em "Tipo de Movimento" e sair | Mensagem `Opção inválida…`; corrigir e sair remove | US3-1a, US3-1b |
| 9 | Atualizar linha | Alterar um campo válido → "Atualizar linha" (canto inferior esquerdo, seta ←) | Linha reescrita; indicador "alterada"; toast "Linha n atualizada"; só as posições do campo mudam | US3-3, US3-9, FR-019 |
| 10 | Edições pendentes | Alterar campo sem atualizar e clicar outra linha | Diálogo Atualizar/Descartar/Cancelar | US3-4 |
| 11 | Trailer divergente + recálculo | Alterar valor de um Segmento A → Atualizar → ver contador de erros → "Recalcular totais" | TL e TA sinalizados com encontrado/esperado; recálculo lista de → para; trailers com "alterada" | US3-6, US3-7, US3-10 |
| 12 | Exportar sem edições | Importar e exportar | `cnabeditor_AAAAMMDDHHMMSS.rem`; arquivo idêntico ao original (`fc /b` no Windows ou `cmp` no Unix) | US4-1, US4-2 |
| 13 | Exportar com erros | Introduzir erro → Exportar | Diálogo com quantidade de erros; download só após confirmar | US4-3 |
| 14 | Colar com emoji | Colar conteúdo com um emoji → Exportar | Diálogo com quantidade, linha e posição; arquivo exportado com `?`, CRLF, 1 byte por posição | FR-025a/b |
| 15 | Preferências | Mover divisórias, desligar quebra, trocar para light → recarregar | Tudo restaurado; em janela anônima, padrões | US5-1..4 |
| 16 | Privacidade | DevTools → Network, importar/editar/exportar | Nenhuma requisição após o carregamento inicial | SC-008 |
| 17 | Desempenho | `npm run test:perf` ou importar o arquivo gerado de 100k linhas | 10k linhas ≤ 3 s; rolagem e seleção fluidas com 100k | SC-005 |

Para comparar bytes no Windows:

```powershell
fc.exe /b tests\golden\febraban-cnab240-v10.11\valid\pagamento-remessa.rem "$env:USERPROFILE\Downloads\cnabeditor_*.rem"
```

## Publicação

O conteúdo de `dist/` é estático e pode ser servido por qualquer host de arquivos estáticos (HTTPS recomendado para a Clipboard API). Não há backend nem variáveis de ambiente.
