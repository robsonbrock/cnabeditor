# Contract: Preferências no navegador

Única informação persistida pela aplicação (FR-032, FR-034). Nenhum conteúdo de arquivo é gravado em `localStorage`, `sessionStorage`, IndexedDB, Cache API ou cookies.

- **Storage**: `window.localStorage`
- **Key**: `cnabeditor.prefs.v1`
- **Value**: JSON

```json
{
  "theme": "dark",
  "wrap": true,
  "splitMainPct": 55,
  "splitRightPct": 55
}
```

| Campo | Tipo | Faixa | Padrão | Significado |
|---|---|---|---|---|
| `theme` | `"dark" \| "light"` | — | `"dark"` | FR-031 |
| `wrap` | boolean | — | `true` | quebra de linha no quadro principal (FR-012) |
| `splitMainPct` | number | 10–90 | `55` | largura do quadro principal em % da área útil |
| `splitRightPct` | number | 10–90 | `55` | altura da lista de campos em % da coluna direita (detalhes = 100 − valor) |

Regras:
- Leitura e escrita sempre em `try/catch`; qualquer falha (storage indisponível, JSON inválido) → padrões, sem erro visível.
- Campos ausentes, de tipo errado ou fora da faixa → padrão daquele campo.
- Os mínimos em pixels (R11) prevalecem sobre a porcentagem salva quando a janela é pequena; a porcentagem salva não é reescrita por isso.
- Gravação ao soltar a divisória, ao alternar tema e ao alternar quebra de linha.
- Mudança incompatível de formato → nova chave (`v2`); a antiga é ignorada.
