# Tasks: Ajuste visual

**Input**: [spec.md](spec.md)

- [X] T001 Criar src/ui/components/Icon.tsx: ícones SVG inline (traço, `currentColor`) e o componente `Logo` (VR-001, VR-002, VR-009)
- [X] T002 Criar public/favicon.svg com o mesmo desenho do `Logo` e referenciá-lo em index.html (VR-002)
- [X] T003 Reescrever src/ui/styles/tokens.css: paleta dark da primeira versão e paleta light equivalente (VR-003)
- [X] T004 Reescrever src/ui/styles/app.css: botões, barra do quadro principal, etiquetas de registro, grade de campos, cartões de detalhe, rodapé, diálogos e toasts (VR-003 a VR-007)
- [X] T005 Header.tsx: marca, Importar arquivo, Colar conteúdo e tema só com ícone; expor `openImport`/`openPaste` (VR-001, VR-002)
- [X] T006 MainPane.tsx: barra com arquivo, tipo, linhas, erros, Recalcular totais e interruptor Quebrar linhas (`role="switch"`); estado vazio com ações (VR-004)
- [X] T007 VirtualLines.tsx: número da linha, marcador e etiqueta por tipo; `FIXED_WIDTH` alinhado ao CSS (VR-005)
- [X] T008 EditPane.tsx e FieldInput.tsx: cabeçalho de colunas, leitura do valor (`fieldHint`), Atualizar linha com seta-ícone no canto inferior esquerdo (VR-006, VR-008)
- [X] T009 DetailPane.tsx: cartões e grade de valores permitidos (VR-007)
- [X] T010 Footer.tsx e Toasts.tsx: ícones; "Exportar .rem/.ret" conforme o tipo; "Processado só no seu navegador" (VR-001)
- [X] T011 Ajustar testes ao novo markup: seta como ícone (`data-icon="arrow-left"`), ícone do toast por `data-icon`, `aria-checked` no interruptor; atualizar contracts/ui-contract.md da 001
- [X] T012 Linhas com espaços no fim: `white-space: break-spaces` para a quebra visual coincidir com a altura calculada
- [X] T013 Realce cinza ao passar o mouse; linha alterada com fundo e barra âmbar (VR-010)
- [X] T014 VirtualLines.tsx: destacar com `<mark class="field-focus">` o trecho do campo em foco na linha selecionada; teste em us2-detail.spec.ts (VR-011)
