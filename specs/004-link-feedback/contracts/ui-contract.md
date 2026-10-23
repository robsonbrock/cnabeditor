# UI Contract: Link "Enviar feedback"

## Elemento

| Atributo | Valor | Requisito |
|---|---|---|
| Elemento | `<a>` | F1 |
| `data-testid` | `feedback-link` | — |
| Texto visível | `Enviar feedback` + ícone `external` (`data-icon="external"`, 12 px) | FR-006 |
| `href` | `https://forms.gle/vtu9hDoSFQvkiWfo6` (exato, sem parâmetros) | FR-002, FR-004 |
| `target` | `_blank` | FR-003 |
| `rel` | `noopener noreferrer` | FR-005 |
| `aria-label` | `Enviar feedback (abre o formulário em nova aba)` | FR-007 |
| `title` | igual ao `aria-label` | FR-007 |

## Posição

- Dentro de `.footer-meta` (`data-testid="app-footer"`), como último item, depois do `<span>` que contém o `manual-link`.
- Presente em todos os estados: documento vazio, carregado, com erros de validação (FR-001).

## Comportamento

- O clique segue a navegação padrão do navegador: abre uma nova aba e não chama nenhum handler da aplicação.
- O `href` é o mesmo com ou sem documento carregado (FR-004).
- A aba do editor mantém conteúdo, seleção e edições pendentes (FR-003).
- A aba do editor não faz nenhuma requisição de rede por causa do link (SC-004; suíte de privacidade).

## Estilo

- Usa as regras existentes `.app-footer a` e `.app-footer a:hover`, sem CSS novo.
- Temas claro e escuro pela variável `--accent`, como o `manual-link`.
- Em telas estreitas, quebra de linha pelo `flex-wrap` de `.footer-meta`, sem rolagem horizontal.
