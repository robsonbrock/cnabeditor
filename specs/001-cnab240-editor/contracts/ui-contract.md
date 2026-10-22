# Contract: Interface (página única)

Contrato observável da página, usado pelos testes E2E (Playwright). Os seletores `data-testid` são estáveis; textos em pt-BR conforme a spec.

## Regiões

| Região | `data-testid` | Conteúdo | Requisitos |
|---|---|---|---|
| Cabeçalho | `app-header` | "CNAB Editor", subtítulo, Importar, Colar conteúdo, indicador de tipo, contador de erros, Recalcular totais, quebra de linha, tema | FR-002, FR-007, FR-016a, FR-023b, FR-012, FR-031 |
| Quadro principal | `main-pane` | cabeçalho com `line-count` ("8 linhas"); lista virtualizada de linhas | FR-003, FR-006a, FR-009*, FR-009d |
| Linha | `line-row` (`data-line="<n>"`) | `line-label` (rótulo), texto da linha; atributos `aria-selected`, `data-changed`, `data-error` | FR-009, FR-009a, FR-009c, FR-009e |
| Quadro de edição | `edit-pane` | cabeçalho `record-title` + `line-position` ("Linha 3 de 8"); lista de campos; rodapé com `update-line` e `discard` | FR-010, FR-011, FR-018a, FR-022a |
| Campo | `field` (`data-field-id`) | `field-pos` ("19–32"), `field-name`, `input`, `field-counter` ("9/14"), `field-error` | FR-011, FR-015a |
| Painel de detalhes | `detail-pane` | nome, de/até, tamanho, tipo, decimais, obrigatoriedade, descrição, `domain-options` com `aria-current` na opção atual, `domain-no-match` | FR-013, FR-014 |
| Divisórias | `split-main`, `split-right` | `role="separator"`, arrastáveis e por teclado | FR-029, FR-030 |
| Rodapé | `app-footer` | `export`, `copy`, `manual-link` (target `_blank`) | FR-004, FR-024, FR-027, FR-028 |
| Toasts | `toast-region` | `toast` com `data-kind="success|error"` | FR-035, FR-036 |

## Diálogos (`<dialog>`)

| `data-testid` | Abre quando | Ações |
|---|---|---|
| `paste-dialog` | "Colar conteúdo" | `paste-confirm`, `paste-cancel` |
| `pending-edits-dialog` | troca de linha com edições não confirmadas | `pending-update`, `pending-discard`, `pending-cancel` |
| `replace-content-dialog` | importar/colar com alterações não exportadas | `replace-confirm`, `replace-cancel` |
| `export-errors-dialog` | exportar com erros (mostra a quantidade) | `export-confirm`, `export-cancel` |
| `export-charset-dialog` | colado com caracteres fora de ISO-8859-1 (quantidade, linhas e posições) | `export-confirm`, `export-cancel` |
| `export-ext-dialog` | tipo "Não identificado" | `ext-rem`, `ext-ret`, `export-cancel` |
| `recalc-dialog` | após "Recalcular totais" | lista de `recalc-change` (registro, campo, de → para) ou "não havia divergências" |

Ordem dos diálogos na exportação: extensão (se necessário) → erros de validação (se houver) → caracteres fora de ISO-8859-1 (se houver) → download.

## Teclado

| Contexto | Tecla | Efeito |
|---|---|---|
| Quadro principal focado | ↑ / ↓ | seleciona linha anterior/seguinte; sem efeito nos extremos; rola para manter visível; mesmo fluxo de edições pendentes do clique |
| Quadro principal focado | Home / End / PageUp / PageDown | primeira / última / página (conveniência) |
| Quadro principal focado | qualquer tecla de texto, Delete, Backspace, Ctrl+V | nada é alterado (FR-006a) |
| Quadro de edição | Tab / Shift+Tab | percorre campos na ordem das posições |
| Divisória focada | ← → / ↑ ↓ | move 2% respeitando mínimos |
| Diálogo | Esc | equivale a cancelar |

## Mensagens (pt-BR)

| Situação | Texto (modelo) |
|---|---|
| Importação OK | `Arquivo "<nome>" importado: <n> linhas` |
| Extensão recusada | `Arquivo não importado: extensão não aceita. Use .rem, .ret ou .txt` |
| Falha de leitura | `Arquivo não importado: <motivo>` |
| Linha atualizada | `Linha <n> atualizada` / `Linha <n> atualizada com <k> campo(s) com erro` |
| Exportação OK | `Arquivo "<nome>" exportado` |
| Falha de exportação | `Arquivo não exportado: <motivo>` |
| Opção inválida | `Opção inválida: "<valor>" não é um valor permitido para este campo` |
| Tipo numérico | `Caractere inválido: o campo aceita apenas dígitos (0–9)` |
| Data inválida | `Data inválida: "<valor>" não é uma data DDMMAAAA válida` |
| Total divergente | `Total divergente: encontrado <x>, esperado <y>` |
| Sem conteúdo | `Não há conteúdo para exibir` |
| Cópia | botão mostra `Copiado ✓` por 2 s |

## Rede

Após o carregamento inicial dos arquivos estáticos, a página não faz nenhuma requisição de rede (CSP `connect-src 'none'`; SC-008). O link do manual abre em nova aba com `rel="noopener noreferrer"`.
