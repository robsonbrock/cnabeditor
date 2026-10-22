# Ajuste visual: CNAB Editor

**Feature Branch**: `002-visual-refresh`
**Created**: 2026-10-22
**Status**: Implementado
**Base**: [001-cnab240-editor](../001-cnab240-editor/spec.md). Nenhum requisito funcional muda; esta feature só altera a aparência.

## Contexto

O editor da feature 001 funciona, mas tem visual genérico e botões só com texto. Esta feature aplica o layout do protótipo de design e usa as cores da primeira versão do editor, nos temas dark e light.

## Requisitos

- **VR-001**: Os botões de ação MUST ter ícone ao lado do texto: Importar arquivo, Colar conteúdo, Recalcular totais, contador de erros, Atualizar linha, Descartar, Exportar e Copiar. O botão de tema MUST mostrar só o ícone (sol no dark, lua no light), com `aria-label`.
- **VR-002**: O cabeçalho MUST exibir a marca do app (ícone `</>` em quadrado arredondado) ao lado do título. O mesmo ícone MUST ser o favicon da página (`public/favicon.svg`).
- **VR-003**: O tema dark MUST usar a paleta da primeira versão: fundo `#0d1117`, superfícies `#161b22` e `#21262d`, texto dos registros `#7dd3fc`, primário `#2563eb`, "Atualizar linha" em verde e rótulos de registro coloridos por tipo (HA, HL, segmentos, TL, TA). O tema light MUST usar a mesma paleta sobre fundo claro, com texto em contraste de pelo menos 4,5:1.
- **VR-004**: Os controles que dependem do arquivo carregado (indicador Remessa/Retorno, contagem de linhas, contador de erros, Recalcular totais, Quebrar linhas) MUST ficar na barra do quadro principal, e não no cabeçalho.
- **VR-005**: Cada linha do quadro principal MUST mostrar o número da linha, o marcador ("alterada" ou "com erro") e o rótulo do registro em forma de etiqueta colorida.
- **VR-006**: O quadro de edição MUST mostrar cabeçalho de colunas (Posição, Campo, Valor, Tam.) e, abaixo do nome do campo, a leitura do valor: opção do domínio, data DD/MM/AAAA ou valor com casas decimais.
- **VR-007**: O painel de detalhes MUST mostrar posição, tamanho, tipo e obrigatoriedade em cartões, e os valores permitidos em grade, com o valor atual destacado.
- **VR-008**: O botão "Atualizar linha" MUST permanecer no canto inferior esquerdo do quadro de edição, com seta para a esquerda (FR-018a inalterado).
- **VR-009**: Nenhuma fonte, ícone ou estilo externo pode ser carregado (Princípio V). Os ícones são SVG inline.
- **VR-010**: No quadro principal, a linha sob o cursor do mouse MUST ganhar um realce cinza sutil antes do clique. Uma linha alterada MUST ter fundo âmbar com barra lateral âmbar. A linha selecionada MUST ter fundo azul com barra lateral azul. A precedência é: selecionada > mouse > alterada.
- **VR-011**: Na linha selecionada, o trecho do campo em foco no quadro de edição MUST ficar destacado (fundo âmbar), acompanhando cada campo focado por clique ou Tab.

## Referências

- Protótipo de design (claude.ai, artefato privado): tela principal, estado vazio e diálogos, temas dark e light.
- Cores: captura de tela da primeira versão do editor.
