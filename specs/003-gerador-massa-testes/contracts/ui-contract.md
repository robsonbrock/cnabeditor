# Contrato de interface: Gerador de massa de testes

Complementa [../../001-cnab240-editor/contracts/ui-contract.md](../../001-cnab240-editor/contracts/ui-contract.md). Os `data-testid` abaixo são estáveis e usados pelos testes de componente e E2E.

## Botão de entrada (FR-001)

| Local | testid | Aparência | Estado |
|---|---|---|---|
| Cabeçalho (`Header.tsx`), logo após "Colar conteúdo" e antes do divisor do tema | `generate` | `btn` com ícone `wand` + texto "Gerar massa de testes" | Sempre visível e habilitado |
| Tela vazia do quadro principal (`MainPane.tsx`), 3º botão de `.empty-actions` | `generate-empty` | `btn` com o mesmo ícone e texto | Só com quadro vazio |

Texto da tela vazia, acima dos botões: "Importe um arquivo CNAB 240 (.rem, .ret ou .txt), cole o conteúdo ou gere uma massa de testes."

Os dois botões abrem a modal (`generatorOpen = true`).

## Modal (`GeneratorDialog.tsx`, `<Dialog wide testId="generator-dialog" title="Gerar massa de testes">`)

Ordem vertical:

1. **Direção**: grupo de rádio `generator-direction` com `generator-direction-remessa` (padrão) e `generator-direction-retorno`.
2. **Segmentos** (`generator-variants`): um `<fieldset>` por serviço (`generator-group-<headerId>`; `<legend>` = título do Header de Lote sem "Header de Lote – ", ex.: "Pagamentos (Títulos de Cobrança e QR Code Pix)"). Cada linha tem:
   - checkbox `generator-variant-<variantId>`, rotulado com o título do detalhe sem "Detalhe – " (ex.: "Segmento J-52 Pix");
   - campo numérico `generator-qty-<variantId>`: `inputmode="numeric"`, vazio e desabilitado enquanto o checkbox estiver desmarcado; ao marcar, é habilitado e preenchido com `10`;
   - selo "incluído automaticamente" (`generator-auto-<variantId>`) quando `auto = true`.

   A lista tem rolagem própria; o restante da modal fica fixo.
3. **Avisos** (`generator-notices`, `role="status"`, `aria-live="polite"`): mensagens de inclusão automática, ajuste de quantidade, remoção por troca de direção e recusa ao desmarcar o principal.
4. **Banco e conta da empresa**, todos opcionais (`<fieldset>` "Banco e conta da empresa"):

   | testid | Rótulo | Largura (caracteres) |
   |---|---|---|
   | `generator-bank` | Código do Banco na Compensação | 3 |
   | `generator-agencia` | Agência | 5 |
   | `generator-agencia-dv` | DV | 1 |
   | `generator-conta` | Conta | 12 |
   | `generator-conta-dv` | DV | 1 |
   | `generator-agconta-dv` | DV Ag/Conta | 1 |

   Os limites vêm da definição do Header de Arquivo.
5. **Resumo** (`generator-estimate`): "N linhas serão geradas". Junto dele:
   - aviso (`generator-warning`) acima de 100.000 linhas;
   - erro (`generator-limit`) acima do limite do Trailer de Arquivo.
6. **Ações**: `generator-cancel` ("Cancelar") e `generator-confirm` ("Gerar", `primary`).

Erros de campo: mensagem logo abaixo do campo (`<id>-error`), campo com `aria-invalid="true"` e `aria-describedby` apontando para a mensagem. O momento segue a regra do editor: tipo e tamanho a cada tecla, o resto ao sair do campo.

`generator-confirm` fica `disabled` quando:
- não há seleção (FR-005), com o texto "Marque ao menos um segmento" em `generator-form-error`;
- há campo inválido (FR-009);
- o total passa do limite.

Enquanto gera: o botão mostra "Gerando…" e fica `aria-busy="true"`; os controles da modal ficam desabilitados.

## Fluxo de confirmação e resultado

- **Quadro com conteúdo** (FR-029): abre `replace-content-dialog` por cima da modal, com o texto "O conteúdo atual do quadro principal será substituído pela massa gerada."
  - `replace-cancel` volta à modal, com as escolhas mantidas;
  - `replace-confirm` gera.
- **Sucesso**: a modal fecha, o documento é carregado com a linha 1 selecionada e aparece o toast `success` "Massa de testes gerada: N linhas".
- **Falha**: a modal continua aberta, o quadro principal não muda e aparece o toast `error` "Massa de testes não gerada: <motivo>".
- **Fechar** (`generator-cancel` ou Esc): nada muda (US5-4). A modal reabre sempre com os valores padrão.

## Teclado e acessibilidade

- Ordem de Tab: direção → checkboxes e quantidades, na ordem da lista → banco e conta → Cancelar → Gerar.
- Enter num campo da modal equivale a "Gerar", quando habilitado.
- O foco inicial vai no primeiro rádio de direção. Ao fechar, o foco volta para o botão que abriu a modal (comportamento do `Dialog`).
