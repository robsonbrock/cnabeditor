# Feature Specification: Editor CNAB 240

**Feature Branch**: `001-cnab240-editor`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Editor de página única, sem login, para importar, visualizar, editar campo a campo, copiar e exportar arquivos CNAB 240 (remessa/retorno) com validação de campos em tempo real, painel de detalhes do campo, divisórias redimensionáveis com medidas salvas no navegador, temas dark/light e referência ao manual FEBRABAN CNAB 240 v10.11."

## Clarifications

### Session 2026-10-22

- Q: Quando o conteúdo vem da janela "Colar conteúdo" (e não de um arquivo importado), que quebra de linha o arquivo exportado deve usar? → A: Exportar sempre com CRLF.
- Q: Que codificação de caracteres (encoding) o arquivo exportado deve usar quando o conteúdo veio da janela "Colar conteúdo"? → A: ISO-8859-1; caracteres sem representação nessa codificação são substituídos por "?" e o sistema avisa.
- Q: Enquanto o usuário ainda está digitando num campo, a mensagem de erro já deve aparecer embaixo dele, ou só quando ele sai do campo? → A: Tipo e tamanho a cada tecla; valores permitidos e datas ao sair do campo; a mensagem segue o mesmo momento.
- Q: O usuário deve poder navegar entre as linhas do quadro principal pelo teclado (setas ↑/↓ para trocar a linha selecionada), além do clique? → A: Sim; setas ↑/↓ no quadro principal, com o mesmo aviso de edições pendentes; Tab percorre os campos do quadro de edição.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carregar e inspecionar um arquivo CNAB 240 (Priority: P1)

Um analista recebe um arquivo CNAB 240 (remessa ou retorno) e precisa entender o que há nele. Ele abre a página e importa o arquivo (.rem, .ret ou .txt) ou abre a janela "Colar conteúdo", um editor de texto livre onde pode colar e ajustar o conteúdo antes de confirmá-lo no quadro principal à esquerda. O sistema exibe as linhas, identifica se o arquivo é remessa ou retorno e, ao selecionar uma linha, mostra no quadro à direita o tipo de registro (ex.: "Header de Arquivo", "Detalhe – Segmento P") e a lista de todos os campos daquela linha, cada um com título, posição, valor e contagem "preenchido/total" (ex.: `19–32 · Número de Inscrição da Empresa · 377654540 · 9/14`).

**Why this priority**: Sem carregar e decompor o arquivo em campos não existe produto; esta jornada sozinha já substitui a contagem manual de posições com o manual em mãos.

**Independent Test**: Importar um arquivo de referência válido, selecionar cada tipo de linha e conferir que os campos, posições e valores exibidos batem com o layout FEBRABAN.

**Acceptance Scenarios**:

1. **Given** a página aberta e vazia, **When** o usuário importa um arquivo `.rem` válido, **Then** o conteúdo aparece no quadro principal, o indicador mostra "Remessa" e a primeira linha fica selecionada com seus campos listados à direita.
2. **Given** a página aberta, **When** o usuário abre a janela "Colar conteúdo", cola o conteúdo de um arquivo de retorno, ajusta o texto livremente e confirma, **Then** o conteúdo vai integralmente para o quadro principal, exatamente como estava na janela: nenhum caractere é removido, acrescentado ou convertido, incluindo espaços no início e no fim das linhas, linhas compostas só de espaços e a quebra de linha final (nada de "trim" ou ajuste semelhante); o indicador mostra "Retorno" e as linhas ficam selecionáveis.
3. **Given** a janela "Colar conteúdo" aberta com texto, **When** o usuário cancela, **Then** a janela fecha e o quadro principal permanece como estava.
4. **Given** conteúdo no quadro principal, **When** o usuário tenta digitar ou apagar caracteres diretamente nele, **Then** nada é alterado; o quadro só permite selecionar linhas.
5. **Given** um arquivo carregado, **When** a página exibe o quadro principal, **Then** cada linha começa com um rótulo do tipo de registro (`HA`, `HL`, o Código Segmento do detalhe como `A`, `B`, `J`, `R`, `TL`, `TA`), visualmente separado do conteúdo.
5a. **Given** um arquivo com 8 linhas carregado, **When** o usuário olha o cabeçalho do quadro principal, **Then** vê "8 linhas"; ao carregar outro conteúdo, o total é atualizado.
6. **Given** um arquivo carregado, **When** o usuário clica em uma linha, **Then** ela fica destacada visualmente, a linha antes selecionada perde o destaque e os campos da linha são carregados no quadro de edição à direita.
6a. **Given** a linha 3 selecionada e o foco no quadro principal, **When** o usuário pressiona ↓, **Then** a linha 4 passa a ser a selecionada, com o mesmo efeito do clique; na última linha, ↓ não faz nada.
7. **Given** um arquivo carregado, **When** o usuário clica em uma linha de detalhe Segmento Q, **Then** o cabeçalho do quadro direito mostra o tipo de registro "Detalhe – Segmento Q" e lista todos os campos do segmento na ordem das posições.
8. **Given** um campo com 9 caracteres significativos num campo de tamanho 14, **When** a linha é exibida, **Then** o contador do campo mostra `9/14`.
9. **Given** o usuário copia ou exporta o conteúdo, **When** o resultado é gerado, **Then** os rótulos de tipo de registro não fazem parte dele e todo o conteúdo do quadro principal é reproduzido integralmente: sequências de espaços (inclusive várias seguidas, no início ou no fim das linhas, e linhas só com espaços) são preservadas caractere a caractere, sem remoção, compactação ou substituição.
10. **Given** o usuário tenta importar um arquivo com extensão diferente de .rem, .ret ou .txt, **When** seleciona o arquivo, **Then** o sistema recusa a importação e um toast de erro explica as extensões aceitas.
11. **Given** o usuário importa um arquivo válido, **When** o conteúdo é carregado, **Then** um toast de sucesso confirma a importação com o nome do arquivo e o total de linhas; se a leitura falhar, um toast de erro informa que o arquivo não foi importado e o motivo.

---

### User Story 2 - Entender um campo pelo painel de detalhes (Priority: P1)

Ao posicionar o cursor em um campo da lista à direita, o painel inferior direito (pouco menos de meia tela) mostra a descrição completa do campo: nome, posição de/até, tamanho, tipo (numérico, alfanumérico, data, valor), casas decimais quando houver, obrigatoriedade e descrição. Para campos com valores codificados (ex.: "Tipo de Registro", 0 a 9), o painel lista cada opção possível com o significado, destacando a opção atualmente preenchida.

**Why this priority**: É o que transforma o editor em ferramenta de consulta do manual; sem isso o usuário continua dependendo do PDF da FEBRABAN.

**Independent Test**: Focar campos de tipos diferentes (numérico, alfanumérico, data, valor, campo codificado) e comparar o conteúdo do painel com o manual.

**Acceptance Scenarios**:

1. **Given** uma linha selecionada, **When** o usuário coloca o cursor no campo "Código de Barras", **Then** o painel mostra nome, posição de/até, tamanho e tipo do campo.
2. **Given** uma linha selecionada, **When** o usuário foca o campo "Tipo de Registro" com valor `3`, **Then** o painel lista as opções 0 a 9 com o significado de cada uma e destaca a opção `3 – Detalhe`.
3. **Given** um campo com valor que não está entre as opções permitidas, **When** o usuário foca o campo, **Then** o painel indica que o valor atual não corresponde a nenhuma opção válida.

---

### User Story 3 - Editar campos e atualizar a linha (Priority: P1)

O usuário altera o valor de um ou mais campos nas caixas de texto do quadro direito. Tipo e tamanho são validados a cada tecla; valores permitidos e datas, a cada saída do campo (quando o valor já está completo); um campo com erro fica destacado e a descrição do erro aparece logo abaixo dele. Ao acionar "Atualizar linha" (botão no canto inferior esquerdo do quadro de edição, com uma seta para a esquerda indicando que os valores seguem para o quadro principal), a linha correspondente no quadro principal é reescrita com os novos valores, respeitando posições e tamanhos, sem alterar nenhum outro byte da linha ou do arquivo.

**Why this priority**: Editar com segurança é a razão de ser do editor; completa o MVP junto com as histórias 1 e 2.

**Independent Test**: Editar um campo de uma linha de um arquivo de referência, atualizar a linha e comparar o resultado com o arquivo original: somente as posições do campo editado podem mudar.

**Acceptance Scenarios**:

1. **Given** um campo numérico de tamanho 14, **When** o usuário digita uma letra, **Then** o campo é sinalizado como inválido com a mensagem da regra violada.
1a. **Given** um campo codificado (ex.: "Tipo de Movimento"), **When** o usuário informa uma opção que não está entre os valores permitidos e sai do campo, **Then** o campo fica destacado como erro e a descrição do erro (ex.: `Opção inválida: "8" não é um valor permitido para este campo`) aparece logo abaixo dele.
1b. **Given** um campo sinalizado com erro, **When** o usuário corrige o valor e sai do campo, **Then** o sistema revalida o campo, remove o destaque e a mensagem de erro; se o novo valor ainda for inválido, o destaque permanece e a mensagem é atualizada para o erro atual.
1c. **Given** uma linha selecionada, **When** o usuário olha o quadro de edição, **Then** o botão "Atualizar linha" está no canto inferior esquerdo do quadro, com uma seta apontando para a esquerda, deixando claro que os valores seguem do quadro de edição (direita) para o quadro principal (esquerda). Ver esboço em [attachments/esboco-quadro-edicao.svg](attachments/esboco-quadro-edicao.svg).
2. **Given** um campo de tamanho 14, **When** o usuário tenta inserir mais de 14 caracteres, **Then** o sistema não aceita além do tamanho e o contador mostra `14/14`.
3. **Given** campos editados e válidos, **When** o usuário aciona "Atualizar linha", **Then** a linha no quadro principal reflete os novos valores com o preenchimento padrão (numéricos com zeros à esquerda, alfanuméricos com espaços à direita) e todo o restante da linha permanece idêntico.
4. **Given** campos editados e não confirmados, **When** o usuário seleciona outra linha (por clique ou pelas setas ↑/↓), **Then** o sistema avisa que há edições pendentes e permite atualizar, descartar ou cancelar a troca.
5. **Given** uma linha com campo inválido, **When** o usuário aciona "Atualizar linha", **Then** a linha é atualizada mesmo assim (validação informa, não bloqueia), o campo continua sinalizado como inválido e a linha no quadro principal passa a exibir um indicador de que possui erro(s), visível mesmo quando ela não está selecionada e distinto do indicador de "alterada"; o indicador some quando a linha deixa de ter erros.
5a. **Given** o usuário aciona "Atualizar linha", **When** a linha é atualizada, **Then** um aviso temporário (toast) confirma a atualização (ex.: "Linha 3 atualizada") e, se a linha ficou com erros, informa a quantidade de campos com erro.
6. **Given** o usuário alterou o valor de um detalhe e o Trailer de Lote ficou divergente, **When** consulta a validação, **Then** o trailer do lote e o Trailer de Arquivo afetados são sinalizados com o valor encontrado e o valor esperado.
7. **Given** trailers divergentes, **When** o usuário aciona "Recalcular totais", **Then** o sistema recalcula, para cada lote, as quantidades e somatórios do seu Trailer de Lote e, para o arquivo, as quantidades do Trailer de Arquivo, e lista quais campos foram alterados (de → para).
8. **Given** trailers já consistentes, **When** o usuário aciona "Recalcular totais", **Then** nenhum byte do arquivo muda e o sistema informa que não havia divergências.
9. **Given** o usuário atualizou uma linha alterando ao menos um campo, **When** olha o quadro principal, **Then** a linha exibe um indicador visual de "alterada", distinto do destaque de seleção e visível mesmo quando a linha não está selecionada.
10. **Given** "Recalcular totais" modificou trailers, **When** o usuário olha o quadro principal, **Then** esses trailers também exibem o indicador de "alterada".
11. **Given** uma linha alterada cujos valores foram editados de volta para o conteúdo original, **When** o usuário atualiza a linha, **Then** o indicador de "alterada" é removido.

---

### User Story 4 - Exportar ou copiar o resultado (Priority: P2)

Terminada a edição, o usuário exporta o conteúdo do quadro principal como arquivo, com download em `.rem` ou `.ret` conforme o tipo identificado e nome no formato `cnabeditor_AAAAMMDDHHMMSS` (ex.: `cnabeditor_20261022115207.rem`), ou copia todo o conteúdo para a área de transferência. O rodapé mostra a versão do manual FEBRABAN usada como referência, com link para o documento oficial.

**Why this priority**: Fecha o ciclo de trabalho, mas o usuário ainda obtém valor (inspeção e edição) sem esta história.

**Independent Test**: Exportar um arquivo importado sem edições e comparar byte a byte com o original; copiar e colar o conteúdo em outro editor e comparar.

**Acceptance Scenarios**:

1. **Given** um arquivo de remessa carregado, **When** o usuário aciona "Exportar" em 22/10/2026 às 11:52:07, **Then** é baixado o arquivo `cnabeditor_20261022115207.rem` com o conteúdo do quadro principal e um toast confirma a exportação com o nome do arquivo.
1a. **Given** a exportação não pôde ser concluída, **When** ocorre a falha, **Then** um toast de erro informa que o arquivo não foi exportado e o motivo.
2. **Given** um arquivo importado e não editado, **When** o usuário exporta, **Then** o arquivo baixado é idêntico byte a byte ao original (encoding, quebras de linha e linha final preservados).
3. **Given** o arquivo contém campos inválidos, **When** o usuário aciona "Exportar", **Then** o sistema informa a quantidade de erros e só baixa o arquivo após confirmação explícita.
4. **Given** conteúdo no quadro principal, **When** o usuário aciona "Copiar", **Then** todo o conteúdo vai para a área de transferência e o sistema confirma a cópia.
5. **Given** a página aberta, **When** o usuário olha o rodapé, **Then** vê a versão do manual (CNAB 240 v10.11, 21/08/2023) com link que abre o PDF oficial da FEBRABAN em nova aba.

---

### User Story 5 - Personalizar a área de trabalho (Priority: P3)

O usuário ajusta a interface à sua tela: arrasta as divisórias entre o quadro principal e os quadros da direita (horizontalmente) e entre a lista de campos e o painel de detalhes (verticalmente); alterna entre quebrar linhas (padrão) e manter linhas inteiras com rolagem horizontal; alterna entre tema dark (padrão) e light. Ao recarregar a página, as medidas e preferências são restauradas; no primeiro acesso valem os padrões.

**Why this priority**: Melhora o conforto de uso, mas não é requisito para inspecionar ou editar arquivos.

**Independent Test**: Alterar divisórias, quebra de linha e tema, recarregar a página e verificar que tudo foi restaurado; limpar os dados do navegador e verificar os padrões.

**Acceptance Scenarios**:

1. **Given** o primeiro acesso, **When** a página abre, **Then** o tema é dark, a quebra de linha está ativada e as divisórias estão nas posições padrão.
2. **Given** o usuário arrastou a divisória vertical principal e a divisória horizontal da direita, **When** recarrega a página, **Then** as divisórias aparecem nas mesmas posições.
3. **Given** a quebra de linha ativada, **When** o usuário a desativa, **Then** cada registro de 240 caracteres ocupa uma única linha visual com rolagem horizontal.
4. **Given** o tema dark, **When** o usuário alterna para light e recarrega, **Then** a página abre em light.
5. **Given** o usuário arrasta uma divisória até o limite, **When** solta, **Then** nenhum quadro fica menor que um tamanho mínimo utilizável.

---

### Edge Cases

- Conteúdo com linhas de tamanho diferente de 240 caracteres: as linhas são exibidas e sinalizadas com o tamanho encontrado; os campos são decompostos até onde houver caracteres.
- Arquivo cujo header não permite identificar remessa ou retorno (código ausente ou inválido): o indicador mostra "Não identificado" e a exportação pede ao usuário que escolha a extensão.
- Linha com tipo de registro ou segmento desconhecido: a linha é preservada intacta, exibida como "Registro não reconhecido" e mostrada como um único campo bruto.
- Arquivo vazio ou conteúdo colado vazio: o sistema informa que não há conteúdo e mantém exportar/copiar desabilitados.
- Quebras de linha mistas (CRLF e LF) ou ausência de quebra no final: preservadas exatamente na exportação.
- Caracteres acentuados ou fora do conjunto esperado: exibidos como estão e sinalizados pela validação, sem conversão automática.
- Importar ou colar um novo conteúdo com edições pendentes: o sistema pede confirmação antes de substituir.
- Arquivo sem trailers, com lote sem Trailer de Lote ou com registros fora de lote: "Recalcular totais" não cria registros; recalcula apenas os trailers existentes e sinaliza a estrutura inválida.
- Lote de um serviço cujo Trailer de Lote não tem somatório de valores: apenas as quantidades são recalculadas.
- Arquivos grandes (até 100.000 linhas): a interface continua responsiva ao rolar, selecionar linhas e editar.
- Armazenamento do navegador indisponível (ex.: navegação privada): a página funciona com os padrões e apenas não restaura preferências.
- Conteúdo colado com espaços no fim das linhas (comum quando os últimos campos são alfanuméricos vazios) ou com linhas só de espaços: preservado integralmente; uma linha que perdesse esses espaços deixaria de ter 240 caracteres.
- Várias ações seguidas gerando toasts (ex.: atualizar duas linhas rapidamente): os avisos são exibidos empilhados ou em sequência, cada um com seus 5 segundos, sem que um esconda o outro antes do tempo.
- Conteúdo colado com caracteres fora de ISO-8859-1 (ex.: emoji, aspas tipográficas de outros alfabetos): a exportação avisa e pede confirmação; confirmada, cada caractere vira "?" no arquivo, mantendo 1 byte por posição.
- Duas exportações no mesmo minuto: recebem nomes diferentes, pois o nome inclui o segundo. Apenas exportações repetidas dentro do mesmo segundo podem gerar o mesmo nome; nesse caso, o comportamento segue o do navegador do usuário.

## Requirements *(mandatory)*

### Functional Requirements

**Estrutura da página**

- **FR-001**: O sistema MUST ser uma página única, de acesso livre, sem login ou cadastro.
- **FR-002**: A página MUST exibir no topo o título "CNAB Editor" com o subtítulo "Edite arquivos CNAB 240 com validação de campos em tempo real".
- **FR-003**: A página MUST conter um quadro principal à esquerda com o conteúdo do arquivo; um quadro superior direito com a lista de campos da linha selecionada; e um quadro inferior direito, com pouco menos da metade da altura útil por padrão, com os detalhes do campo em foco.
- **FR-004**: A página MUST conter um rodapé com as ações "Exportar" e "Copiar" e a informação da versão do manual FEBRABAN de referência.

**Entrada de conteúdo**

- **FR-005**: Usuários MUST poder importar um arquivo com extensão `.rem`, `.ret` ou `.txt`; outras extensões MUST ser recusadas com mensagem explicativa.
- **FR-006**: Usuários MUST poder abrir uma janela modal "Colar conteúdo" com área de texto livre, onde podem colar e editar o conteúdo à vontade; ao confirmar, o texto substitui o conteúdo do quadro principal; ao cancelar, nada muda.
- **FR-006b**: O conteúdo confirmado na janela "Colar conteúdo" MUST ser transferido integralmente ao quadro principal, caractere a caractere: o sistema MUST NOT remover, compactar, acrescentar ou converter espaços (no início, meio ou fim das linhas, ou em linhas só com espaços), quebras de linha ou qualquer outro caractere.
- **FR-006a**: O quadro principal MUST ser somente leitura: não aceita digitação, exclusão nem colagem direta. O conteúdo só muda por importação, pela janela "Colar conteúdo", pela ação "Atualizar linha" ou pela ação "Recalcular totais".
- **FR-007**: O sistema MUST identificar se o conteúdo é remessa ou retorno pelo código de remessa/retorno do Header de Arquivo e exibir um indicador visual ("Remessa", "Retorno" ou "Não identificado").
- **FR-008**: Ao substituir um conteúdo com edições não exportadas, o sistema MUST pedir confirmação.

**Visualização e seleção**

- **FR-009**: Usuários MUST poder selecionar qualquer linha do quadro principal com um clique; a linha selecionada MUST ficar destacada visualmente (apenas uma por vez) e seus campos MUST ser carregados no quadro de edição à direita.
- **FR-009f**: Com o foco no quadro principal, as setas ↑/↓ MUST selecionar a linha anterior/seguinte, com o mesmo efeito do clique (destaque, carga dos campos e o aviso de edições pendentes de FR-022); a linha selecionada MUST ficar visível, rolando o quadro quando necessário. No quadro de edição, a tecla Tab MUST percorrer os campos na ordem das posições.
- **FR-009a**: Cada linha do quadro principal MUST começar com um rótulo do tipo de registro:
  - `HA`: Header de Arquivo
  - `HL`: Header de Lote
  - `A`, `B`, `J`, `R`…: o Código Segmento do Registro Detalhe
  - `TL`: Trailer de Lote
  - `TA`: Trailer de Arquivo
  - `?`: qualquer outro registro (não reconhecido ou de tipo sem rótulo definido)
- **FR-009b**: Os rótulos MUST ser apenas visuais: não fazem parte do conteúdo, não são copiados nem exportados e não interferem nas posições dos campos.
- **FR-009c**: Toda linha cujo conteúdo atual difere do conteúdo carregado originalmente (por "Atualizar linha" ou "Recalcular totais") MUST exibir um indicador visual de "alterada", distinto do destaque de seleção. O indicador some se a linha voltar a ser igual à original e é zerado ao carregar um novo conteúdo.
- **FR-009e**: Toda linha que possua erro(s) de validação MUST exibir no quadro principal um indicador visual de erro, distinto do destaque de seleção e do indicador de "alterada", visível mesmo quando a linha não está selecionada. Ao atualizar uma linha, o indicador MUST refletir o resultado da validação da linha atualizada: aparece se ela ficou com erros e some se não há mais erros.
- **FR-009d**: O cabeçalho do quadro principal MUST exibir o total de linhas do conteúdo carregado (ex.: "8 linhas"), atualizado sempre que o conteúdo for substituído.
- **FR-010**: O quadro superior direito MUST exibir, no seu cabeçalho, o tipo de registro da linha selecionada (Header de Arquivo, Header de Lote, Detalhe com o segmento, Trailer de Lote, Trailer de Arquivo ou "Não reconhecido") e a posição da linha no arquivo (ex.: "Linha 3 de 8").
- **FR-011**: Para cada campo da linha selecionada, o sistema MUST exibir posição de/até, título, valor em caixa de texto editável e contador "tamanho preenchido / tamanho total".
- **FR-012**: O sistema MUST oferecer a opção de quebrar linhas (ativada por padrão) ou manter cada linha inteira com rolagem horizontal, para linhas de 240 caracteres ou mais.

**Painel de detalhes do campo**

- **FR-013**: Ao focar um campo, o painel inferior direito MUST exibir nome, posição inicial e final, tamanho, tipo, casas decimais (quando houver), obrigatoriedade e descrição do campo conforme o manual.
- **FR-014**: Para campos com valores codificados, o painel MUST listar todas as opções válidas com o significado de cada uma e destacar a opção correspondente ao valor atual, ou indicar que o valor atual não corresponde a nenhuma opção.

**Edição e validação**

- **FR-015**: O sistema MUST validar cada campo quanto a tamanho máximo e tipo (numérico, alfanumérico, data, valor) a cada tecla digitada, e quanto a valores permitidos e validade de datas a cada saída do campo, sinalizando o campo inválido com a regra violada. Regras de valores permitidos e de datas MUST NOT sinalizar erro enquanto o usuário ainda está digitando no campo.
- **FR-015a**: Um campo inválido (incluindo opção fora dos valores permitidos) MUST ficar visualmente destacado como erro e exibir a descrição do erro logo abaixo da caixa de texto, informando o valor encontrado e a regra violada.
- **FR-015b**: O destaque e a mensagem abaixo do campo MUST aparecer e sumir no mesmo momento da regra que os gerou (tipo e tamanho a cada tecla; valores permitidos e datas ao sair do campo). O sistema MUST revalidar todas as regras do campo a cada saída do campo (perda de foco): se o valor estiver correto, remove o destaque e a mensagem; se continuar inválido, mantém o destaque e atualiza a mensagem para o erro atual.
- **FR-016**: O sistema MUST validar o tamanho das linhas e a sequência de registros (header de arquivo, lotes, detalhes, trailers) e sinalizar no quadro principal as linhas com problemas.
- **FR-016a**: O sistema MUST exibir um contador com o total de erros de validação do arquivo; ao clicar nele, o sistema seleciona a linha do próximo erro e foca o campo correspondente.
- **FR-017**: As caixas de texto MUST impedir a entrada de mais caracteres que o tamanho do campo.
- **FR-018**: O sistema MUST oferecer a ação "Atualizar linha", que reescreve a linha selecionada no quadro principal a partir dos valores dos campos, aplicando o preenchimento padrão FEBRABAN (zeros à esquerda para numéricos, espaços à direita para alfanuméricos).
- **FR-018a**: O botão "Atualizar linha" MUST ficar no canto inferior esquerdo do quadro de edição e conter uma seta apontando para a esquerda, indicando que os valores seguem do quadro de edição (direita) para o quadro principal (esquerda). Referência visual: [attachments/esboco-quadro-edicao.svg](attachments/esboco-quadro-edicao.svg). A ação "Descartar" (FR-022a) fica ao lado do botão.
- **FR-019**: A atualização de linha MUST alterar somente as posições dos campos editados; todos os demais caracteres da linha e do arquivo MUST permanecer idênticos.
- **FR-020**: A validação MUST informar sem bloquear: linhas com campos inválidos podem ser atualizadas e o arquivo continua editável.
- **FR-021**: O sistema MUST NOT corrigir, truncar, converter caixa ou remover acentos automaticamente sem ação explícita do usuário.
- **FR-022**: Ao trocar de linha com edições não confirmadas, o sistema MUST oferecer atualizar, descartar ou cancelar.
- **FR-022a**: O quadro de edição MUST oferecer a ação "Descartar", que restaura os campos para os valores atuais da linha no quadro principal, desfazendo as edições ainda não atualizadas.
- **FR-023**: Registros não reconhecidos MUST ser preservados intactos.
- **FR-023a**: O sistema MUST validar a consistência dos trailers: cada Trailer de Lote (quantidade de registros do lote e somatórios de valores definidos pelo layout do serviço) e o Trailer de Arquivo (quantidade de lotes e de registros do arquivo), sinalizando valor encontrado e valor esperado.
- **FR-023b**: O sistema MUST oferecer a ação "Recalcular totais", acionada somente pelo usuário, que atualiza os campos divergentes de todos os Trailers de Lote e do Trailer de Arquivo e exibe a lista de campos alterados (registro, campo, valor anterior, novo valor).
- **FR-023c**: "Recalcular totais" MUST alterar somente os campos totalizadores; nenhum outro byte do arquivo é modificado e nenhum registro é criado ou removido.

**Saída**

- **FR-024**: Usuários MUST poder exportar o conteúdo do quadro principal como arquivo para download, com extensão `.rem` para remessa ou `.ret` para retorno; quando o tipo não for identificado, o usuário escolhe a extensão.
- **FR-024a**: O nome do arquivo exportado MUST seguir o formato `cnabeditor_AAAAMMDDHHMMSS.<extensão>`, onde `AAAA` é o ano, `MM` o mês, `DD` o dia, `HH` a hora (00–23), `MM` o minuto e `SS` o segundo do momento da exportação, todos com zeros à esquerda (ex.: exportado em 22/10/2026 às 11:52:07 → `cnabeditor_20261022115207.rem`). O segundo evita que duas exportações feitas no mesmo minuto gerem arquivos com o mesmo nome.
- **FR-025**: Exportar um conteúdo sem edições MUST produzir arquivo idêntico byte a byte ao importado, preservando encoding, quebras de linha e presença ou ausência de quebra final.
- **FR-025a**: Quando o conteúdo do quadro principal veio da janela "Colar conteúdo", a exportação MUST usar CRLF como quebra de linha entre registros, preservando a presença ou ausência de quebra final; todos os demais caracteres são exportados sem alteração. A cópia para a área de transferência não é afetada por esta regra.
- **FR-025b**: Quando o conteúdo do quadro principal veio da janela "Colar conteúdo", a exportação MUST usar a codificação ISO-8859-1 (1 byte por caractere). Se houver caracteres sem representação em ISO-8859-1 (ex.: emoji), o sistema MUST avisar antes de baixar, informando quantos são e as linhas e posições afetadas, e só baixar após confirmação explícita; na exportação, cada um desses caracteres MUST ser gravado como "?". O conteúdo do quadro principal não é alterado. A cópia para a área de transferência não é afetada por esta regra.
- **FR-026**: Exportar conteúdo com erros de validação MUST exigir confirmação explícita, informando a quantidade de erros.
- **FR-027**: Usuários MUST poder copiar todo o conteúdo do quadro principal para a área de transferência, com confirmação visual.
- **FR-027a**: Copiar e exportar MUST reproduzir integralmente o conteúdo do quadro principal (sem os rótulos de FR-009b), preservando caractere a caractere todos os espaços, inclusive sequências de vários espaços, espaços no início e no fim das linhas e linhas só com espaços; o sistema MUST NOT aplicar "trim", compactação ou substituição de espaços.

**Feedback ao usuário**

- **FR-035**: O sistema MUST exibir avisos temporários (toast), com duração de 5 segundos, para:
  - atualização de linha concluída (com a quantidade de campos com erro, quando houver);
  - arquivo importado com sucesso (nome do arquivo e total de linhas) ou erro na importação (motivo, ex.: extensão não aceita, falha de leitura);
  - arquivo exportado com sucesso (nome do arquivo gerado) ou erro na exportação (motivo).
- **FR-036**: Toasts de sucesso e de erro MUST ser visualmente distintos (ex.: cor e ícone), MUST NOT bloquear a interação com a página e MUST desaparecer sozinhos após 5 segundos.
- **FR-028**: O rodapé MUST exibir a versão do manual de referência ("Layout Padrão CNAB 240 – V10.11 – 21/08/2023") com link para o documento oficial: https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf, aberto em nova aba.

**Preferências e layout**

- **FR-029**: Todas as divisórias entre quadros MUST ser redimensionáveis: horizontalmente entre o quadro principal e os quadros da direita, e verticalmente entre a lista de campos e o painel de detalhes.
- **FR-030**: Cada quadro MUST respeitar um tamanho mínimo utilizável ao redimensionar.
- **FR-031**: O sistema MUST oferecer alternância entre tema dark (padrão) e light.
- **FR-032**: Posições das divisórias, opção de quebra de linha e tema MUST ser armazenados no próprio navegador e restaurados ao recarregar a página; no primeiro acesso, ou se o armazenamento estiver indisponível, valem os padrões.

**Privacidade**

- **FR-033**: O conteúdo dos arquivos MUST ser processado inteiramente no navegador do usuário e MUST NOT ser enviado a nenhum servidor ou serviço externo.
- **FR-034**: O conteúdo dos arquivos MUST NOT ser armazenado no navegador; somente as preferências de interface são persistidas.

### Key Entities

- **Arquivo CNAB**: conteúdo carregado; atributos: tipo (remessa, retorno, não identificado), nome de origem, encoding, padrão de quebra de linha, presença de quebra final, lista de registros, indicador de edições pendentes.
- **Registro (linha)**: uma linha do arquivo; atributos: número da linha, conteúdo original, conteúdo atual, tamanho, tipo de registro, segmento (quando detalhe), rótulo exibido, indicador de alterada, indicador de erro, lista de campos, status de validação.
- **Definição de layout**: descrição declarativa do layout FEBRABAN CNAB 240 v10.11 por tipo de registro e segmento; fonte normativa e versão.
- **Definição de campo**: nome, posição inicial, posição final, tamanho, tipo, casas decimais, obrigatoriedade, descrição e lista de valores permitidos.
- **Valor permitido**: código e significado de uma opção de campo codificado.
- **Erro de validação**: linha, posição inicial/final, nome do campo, valor encontrado e regra violada.
- **Preferências do usuário**: posições das divisórias, quebra de linha ativa e tema; persistidas no navegador.
- **Aviso (toast)**: mensagem temporária de feedback; atributos: tipo (sucesso ou erro), texto, duração (5 segundos).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário identifica o nome, posição e significado de qualquer campo de uma linha em menos de 10 segundos, sem consultar o manual em PDF.
- **SC-002**: 100% dos arquivos de referência importados e exportados sem edições ficam idênticos byte a byte ao original.
- **SC-003**: Após editar um campo e atualizar a linha, 100% dos caracteres fora do campo editado permanecem inalterados nos testes com arquivos de referência.
- **SC-004**: O feedback de validação de tipo e tamanho aparece em até 200 ms após cada tecla digitada, e o de valores permitidos e datas em até 200 ms após o usuário sair do campo, percebidos como imediatos.
- **SC-005**: Um arquivo de 10.000 linhas é carregado e exibido em até 3 segundos, e arquivos de até 100.000 linhas abrem sem travar a interface.
- **SC-005a**: Ao clicar numa linha, os campos aparecem no quadro de edição de forma percebida como imediata (até 200 ms), e o usuário identifica todas as linhas alteradas apenas olhando o quadro principal.
- **SC-005b**: 100% dos conteúdos colados e depois copiados ou exportados nos testes (incluindo linhas com espaços finais e linhas só com espaços) ficam idênticos caractere a caractere ao conteúdo colado; na exportação, a única diferença admitida é a quebra de linha, que é sempre CRLF (FR-025a).
- **SC-005c**: Em testes com usuários, 100% das ações de importar, exportar e atualizar linha geram um aviso de sucesso ou erro, e os usuários identificam o campo com erro e o motivo sem abrir o painel de detalhes.
- **SC-006**: Após recarregar a página, 100% das preferências (divisórias, quebra de linha, tema) são restauradas.
- **SC-007**: 90% dos usuários de teste completam o fluxo importar → editar um campo → exportar na primeira tentativa, sem ajuda.
- **SC-008**: Nenhum byte do conteúdo de arquivos sai do navegador do usuário durante o uso, verificado por inspeção do tráfego de rede.

## Assumptions

- Escopo é CNAB 240 conforme o layout padrão FEBRABAN v10.11 (21/08/2023), cobrindo todos os serviços e segmentos definidos no manual; CNAB 400 e layouts específicos de bancos ficam fora desta feature.
- No CNAB 240, cada lote tem seu Trailer de Lote (quantidade de registros e, conforme o serviço, somatórios de valores) e o arquivo tem um Trailer de Arquivo com quantidade de lotes e de registros; os campos exatos de cada trailer seguem a definição do manual por serviço.
- O tipo remessa/retorno é identificado pelo campo "Código Remessa/Retorno" do Header de Arquivo (posição 143: 1 = remessa, 2 = retorno), não pela extensão do arquivo.
- O tipo de registro é identificado pela posição 8 e, nos detalhes, o segmento pela posição 14, conforme o manual.
- "Atualizar linha" é uma ação explícita (botão) aplicada à linha selecionada; não há reescrita automática a cada tecla.
- O contador "preenchido" considera os caracteres significativos do valor, desconsiderando o preenchimento padrão (zeros à esquerda em numéricos, espaços à direita em alfanuméricos).
- Totalizadores dos trailers nunca são recalculados automaticamente; somente pela ação "Recalcular totais". Números sequenciais de registro dentro do lote não fazem parte do recálculo nesta feature; a validação sinaliza divergências.
- Desfazer/refazer e busca no conteúdo ficam fora desta feature.
- Uso em navegadores desktop modernos; uso em celular não é alvo nesta versão.
- Um arquivo é aberto por vez.
- Textos da interface em português do Brasil.
- Data e hora do nome do arquivo exportado são as do relógio local do computador do usuário, no momento em que a exportação é acionada.
- A confirmação de "Copiar" (FR-027) permanece como confirmação visual; os toasts de 5 segundos são exigidos para atualizar linha, importar e exportar.
