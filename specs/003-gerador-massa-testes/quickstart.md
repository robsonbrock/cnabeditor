# Quickstart: validar o gerador de massa de testes

Este guia mostra que a feature funciona de ponta a ponta. Ele referencia [spec.md](spec.md), [data-model.md](data-model.md) e [contracts/](contracts/) sem repetir as regras.

## Pré-requisitos

- Node.js 22 e as dependências instaladas (`npm install`).
- Branch `003-gerador-massa-testes`.

## 1. Metadados do layout

```bash
npm run validate:layout
```

**Esperado**:
- `generation.json` válido contra [contracts/generation-metadata.schema.json](contracts/generation-metadata.schema.json);
- todo id citado existe no layout;
- todo registro tem o campo `codigoBanco`.

## 2. Testes automatizados

```bash
npm test -- tests/unit/generate     # estratégias, catálogo, seleção, plano, geração
npm run test:golden                 # inclui os golden files gerador-*.rem/.ret
npm run test:e2e -- generator       # fluxo das histórias 1, 2, 3 e 5
npm run test:perf                   # @perf: 10.000 e 100.000 linhas (SC-003)
```

**Esperado**: tudo verde. O teste `generate-all-variants` gera cada variação do catálogo em cada direção e exige 0 erros de validação (SC-001).

## 3. Roteiro manual (`npm run dev`)

| # | Ação | Resultado esperado | Spec |
|---|---|---|---|
| 1 | Abrir o editor vazio | "Gerar massa de testes" aparece no cabeçalho, após "Colar conteúdo", e na tela vazia | FR-001 |
| 2 | Abrir a modal | Remessa marcado, nada selecionado, "Gerar" desabilitado com "Marque ao menos um segmento" | US1-1, FR-005 |
| 3 | Marcar "Segmento A" (Pagamentos – Crédito em Conta…) e "Segmento J" (Pagamentos – Títulos de Cobrança…); Gerar | 26 linhas: 2 lotes com 10 detalhes cada; contador de erros em 0; toast "Massa de testes gerada: 26 linhas" | US1-3/4/7 |
| 4 | Reabrir a modal; Código do Banco `033`; agência `1234`, conta `56789`; marcar "Segmento P" (Cobrança); Gerar → Substituir | Pos. 1–3 = `033` em todas as linhas; agência/conta nos headers e em cada P; contas de terceiros variadas | US2, FR-024–026 |
| 5 | Marcar só "Segmento Q" (Cobrança) | Segmento P marcado automaticamente com selo e aviso; tentar desmarcar P é recusado | US3-1/2 |
| 6 | Q = 8 com P = 5; depois P = 3 | P passa a 8, com aviso; depois volta para 8, com aviso | US3-5/5a |
| 7 | Trocar para Retorno | Q/P somem da seleção com aviso; aparecem T/U, E, F… | US4-1 |
| 8 | Quantidade `0`, `10001`, `abc` | Campo inválido com mensagem; "Gerar" desabilitado | Edge cases |
| 9 | Várias variações com 10.000 cada, até passar de 100.000 linhas | Aviso de demora; acima do limite do trailer, "Gerar" desabilitado | Edge cases |
| 10 | Exportar a massa | Arquivo `.rem`/`.ret` em ISO-8859-1 com CRLF | FR-031 |
| 11 | DevTools › Network durante a geração | Nenhuma requisição | FR-032 |
