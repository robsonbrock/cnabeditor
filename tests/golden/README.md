# Golden files

Arquivos de referência do layout FEBRABAN CNAB 240 v10.11 (Constituição, Princípio IV). Cada arquivo em `febraban-cnab240-v10.11/valid/` ou `febraban-cnab240-v10.11/invalid/` (`.rem`, `.ret` ou `.txt`) tem um irmão `<arquivo>.expected.json`:

```json
{
  "direction": "remessa",
  "labels": ["HA", "HL", "A", "B", "TL", "TA"],
  "errors": [
    { "line": 3, "start": 120, "end": 134, "fieldId": "valorPagamento", "rule": "type" }
  ],
  "recalc": [
    { "line": 5, "fieldId": "somatoriaValores", "from": "000000000000010000", "to": "000000000000020000" }
  ]
}
```

| Campo | Significado |
|---|---|
| `direction` | `remessa`, `retorno` ou `unknown` (FR-007) |
| `labels` | rótulo esperado de cada linha (FR-009a) |
| `definitions` | id da definição esperada por linha (opcional; golden files `cobertura-*`) |
| `errors` | erros de `validateDocument`, por linha, posição, campo e regra; `found`/`expected` opcionais (trailers) |
| `recalc` | mudanças esperadas de "Recalcular totais" (opcional) |

Os testes em `tests/golden/*.test.ts` (parse, round-trip byte a byte, validação, recálculo) percorrem todos os arquivos automaticamente; o round-trip é gate de merge.

## Regras

- **Somente dados fictícios** (Princípio V): nomes, CPF/CNPJ, agências, contas e valores inventados. Nunca versione um arquivo real de cliente, nem anonimizado parcialmente.
- Os arquivos `valid/cobertura-*.rem` exercitam cada definição de layout ao menos uma vez (T097); o teste de parse falha se alguma definição ficar sem golden file.
- Os arquivos são gerados por `scripts/generate-golden.ts` a partir das definições de layout, para que posições e preenchimento sigam exatamente o layout. Arquivos de casos de borda (quebras mistas, BOM, Latin-1) também saem do script, que grava os bytes exatos.
- Os arquivos `valid/gerador-*.rem/.ret` são saídas do gerador de massa de testes (feature 003) com semente e data fixas, gerados por `scripts/generate-golden-gerador.ts`. `tests/golden/gerador.test.ts` exige que o gerador os reproduza byte a byte: se o formato da massa mudar de propósito, regenere-os com o script.
- Todo bug corrigido ganha um golden file ou teste que o reproduza.
- Os bytes não podem ser alterados por editores (sem normalizar quebras de linha nem encoding); `.gitattributes` marca estes arquivos como binários.
