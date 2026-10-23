# Feature Specification: Link de Feedback

**Feature Branch**: `004-link-feedback`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "como usuário quero dar um feedback para o criador do site para ter um canal de comunicação e expôr minha opinião. Para isso, pensei num simples link para um google forms. segue o link do formulário https://forms.gle/vtu9hDoSFQvkiWfo6"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar feedback ao criador do site (Priority: P1)

Um analista que usa o editor encontra um problema, sente falta de um recurso ou quer elogiar a ferramenta. Ele procura um jeito de falar com o criador do site, encontra o link "Enviar feedback" no rodapé, junto da referência ao manual e do aviso "Processado só no seu navegador", e o aciona. O formulário de feedback abre em uma nova aba; o editor continua aberto na aba original, com o arquivo e as edições intactos.

**Why this priority**: É a funcionalidade inteira. Hoje o usuário não tem nenhum canal para dar sua opinião, e o criador não recebe retorno de quem usa a ferramenta.

**Independent Test**: Com o editor aberto (vazio ou com um arquivo carregado e editado), acionar "Enviar feedback" e verificar que o formulário abre em nova aba, que o endereço aberto é exatamente o do formulário e que o conteúdo do editor permanece como estava.

**Acceptance Scenarios**:

1. **Given** o editor aberto, com ou sem conteúdo, **When** o usuário olha o rodapé, **Then** vê o link "Enviar feedback", com ícone de link externo, no mesmo estilo do link de referência ao manual.
2. **Given** o link visível, **When** o usuário o aciona, **Then** o formulário `https://forms.gle/vtu9hDoSFQvkiWfo6` abre em uma nova aba.
3. **Given** um arquivo carregado com edições não exportadas, **When** o usuário aciona "Enviar feedback", **Then** a aba do editor continua aberta, com o mesmo conteúdo, a mesma linha selecionada e as mesmas edições.
4. **Given** um arquivo carregado, **When** o usuário aciona "Enviar feedback", **Then** nenhum dado do arquivo (nome, conteúdo, campos, documentos, contas ou valores) é incluído no endereço aberto nem enviado ao formulário.
5. **Given** um usuário que navega só pelo teclado ou usa leitor de tela, **When** ele chega ao link, **Then** o link recebe foco visível e é anunciado com um nome que indica que abre o formulário de feedback em uma nova aba.

### Edge Cases

- O usuário está sem acesso à internet: o navegador abre a nova aba e mostra o erro de conexão dele; o editor, que funciona localmente, não é afetado.
- O navegador bloqueia a abertura de novas abas: o link continua sendo um link comum, então o usuário pode abri-lo pelo menu de contexto do navegador ou copiar o endereço.
- Tela estreita (celular): o link continua visível e acionável no rodapé, sem causar rolagem horizontal.
- Tema claro e escuro: o link mantém contraste legível nos dois temas, como o link de referência ao manual.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST exibir um link "Enviar feedback" no rodapé, junto do link de referência ao manual, em todos os estados do editor (vazio, com arquivo, com erros de validação).
- **FR-002**: O link MUST apontar para o formulário `https://forms.gle/vtu9hDoSFQvkiWfo6`, sem parâmetros adicionais.
- **FR-003**: Acionar o link MUST abrir o formulário em uma nova aba e MUST NOT alterar, recarregar ou descartar o conteúdo, a seleção ou as edições do editor.
- **FR-004**: O sistema MUST NOT transmitir ao formulário, nem incluir no endereço, qualquer dado do arquivo aberto (nome, conteúdo, campos ou metadados); o envio de qualquer informação depende apenas do que o usuário digitar no próprio formulário.
- **FR-005**: A página aberta MUST NOT ter acesso à aba do editor (a nova aba não pode controlar nem ler a página de origem).
- **FR-006**: O link MUST seguir o mesmo estilo visual do link de referência ao manual, incluindo o ícone de link externo, nos temas claro e escuro.
- **FR-007**: O link MUST ser acessível por teclado, ter foco visível e um nome acessível que informe que abre o formulário de feedback em uma nova aba.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário que nunca viu o editor encontra o canal de feedback em até 10 segundos, sem instruções.
- **SC-002**: O formulário abre com 1 único clique (ou 1 tecla), a partir de qualquer estado do editor.
- **SC-003**: Em 100% das vezes em que o link é acionado, o conteúdo do editor permanece idêntico ao de antes.
- **SC-004**: Nenhum byte do arquivo aberto sai do navegador do usuário por causa do link de feedback.
- **SC-005**: O criador do site passa a receber feedback espontâneo dos usuários por meio do formulário a partir da publicação da funcionalidade.

## Assumptions

- O formulário já existe, é mantido pelo criador do site fora do editor e aceita respostas sem que o usuário precise de login; o conteúdo, as perguntas e a gestão das respostas ficam fora do escopo.
- O endereço do formulário é fixo; trocar de formulário é uma mudança de configuração do site, sem fluxo dentro do editor.
- O rodapé é o lugar do link: é onde o editor já reúne links externos (referência ao manual) e o aviso de processamento local, e o link não compete com as ações principais do cabeçalho.
- O texto do link é "Enviar feedback", em português, como o restante da interface.
- O link não coleta nem envia dados automaticamente, mantendo o princípio de processamento local (Princípio V da constituição); o editor não registra quem acionou o link nem quantas vezes.
- Não há formulário embutido, contagem de envios, nem confirmação de envio dentro do editor.
