# Data Model: Link de Feedback

A feature não tem entidades, estado nem persistência.

## Constante

| Nome | Valor | Onde | Regras |
|---|---|---|---|
| `FEEDBACK_URL` | `https://forms.gle/vtu9hDoSFQvkiWfo6` | [Footer.tsx](../../src/ui/components/Footer.tsx) | Literal fixo, sem query string. Não depende de `doc`, `layout` nem `prefs` (FR-002, FR-004). |

## Estado afetado

Nenhum. Acionar o link não altera `doc`, a seleção, as edições pendentes, `prefs` nem o armazenamento do navegador (FR-003).
