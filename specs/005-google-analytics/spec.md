# Feature Specification: Medição de Uso com Google Analytics

**Feature Branch**: `005-google-analytics`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "vamos incluir uma tag do google analytics no site, conforme abaixo. deve pegar em todas as ações. me informa se tiver dúvidas ou sugestões sobre a tag. Segue a tag: Google tag (gtag.js) com o ID de medição G-TKLBD459FS (carrega o script do Google, inicializa a fila de eventos e configura o ID)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber quantas pessoas usam o editor (Priority: P1)

O criador do site quer saber se o editor está sendo usado: quantas visitas recebe, quantos usuários distintos, de onde vêm (acesso direto, busca, links) e em que dispositivos. Ele abre o painel do Google Analytics da propriedade `G-TKLBD459FS` e vê as visitas do editor publicado.

**Why this priority**: É o mínimo que a tag entrega e a base de todas as outras medições. Sem ela, nenhuma ação pode ser medida.

**Independent Test**: Abrir o editor publicado e, no relatório em tempo real do Google Analytics, verificar que a visita aparece em até 1 minuto.

**Acceptance Scenarios**:

1. **Given** o editor publicado, **When** um usuário abre o site, **Then** uma visita é registrada na propriedade `G-TKLBD459FS`.
2. **Given** o editor rodando em ambiente de desenvolvimento ou em testes automatizados, **When** o site é aberto, **Then** nenhuma visita é registrada.
3. **Given** o usuário com bloqueador de anúncios ou sem internet, **When** abre o editor, **Then** o editor funciona por completo, sem erros visíveis e sem atraso perceptível.

---

### User Story 2 - Saber quais ações os usuários executam (Priority: P2)

O criador do site quer saber o que as pessoas fazem no editor: se importam ou colam arquivos, se usam o gerador de massa de testes, se editam linhas, se exportam, se recalculam totalizadores, se navegam pelos erros, se trocam o tema, se acionam o feedback. Com isso, decide onde investir. Como o editor é uma página única, a medição automática de visitas não mostra essas ações; cada ação relevante precisa gerar seu próprio evento.

**Why this priority**: Atende ao pedido "deve pegar em todas as ações", mas depende da US1 e entrega valor só depois de ela existir.

**Independent Test**: Executar cada ação da lista de FR-005 no editor publicado e verificar no relatório em tempo real que o evento correspondente aparece, com o nome e os parâmetros esperados e sem nenhum dado do arquivo.

**Acceptance Scenarios**:

1. **Given** o editor aberto, **When** o usuário importa um arquivo, **Then** é registrado um evento de importação com o tipo de layout e a direção (remessa/retorno) detectados e a quantidade de linhas, sem nome nem conteúdo do arquivo.
2. **Given** o gerador de massa aberto, **When** o usuário gera um arquivo, **Then** é registrado um evento de geração com as opções escolhidas (serviço, quantidade de registros), sem os dados gerados.
3. **Given** um arquivo com erros de validação, **When** o usuário o exporta confirmando a exportação com erros, **Then** é registrado um evento de exportação indicando que havia erros e quantos, sem os valores dos campos.
4. **Given** qualquer ação da lista de FR-005, **When** ela é executada, **Then** exatamente um evento é registrado para aquela execução.
5. **Given** uma ação cancelada (ex.: o usuário fecha o diálogo de exportação sem confirmar), **When** o diálogo é fechado, **Then** fica registrado que a ação foi cancelada, distinta da ação concluída.

---

### User Story 3 - Usuário informado sobre a medição (Priority: P3)

O usuário do editor lida com arquivos que contêm dados pessoais e bancários. Ele precisa saber que o site mede o uso e que essa medição não leva nenhum dado dos seus arquivos. A medição é sempre ativa; não há aviso de consentimento nem opção de recusa dentro do editor.

**Why this priority**: Transparência exigida pela LGPD e pelo Princípio V da constituição; o aviso "Processado só no seu navegador" continua verdadeiro para os arquivos, mas o usuário deve saber que dados de uso saem do navegador.

**Independent Test**: Abrir o editor em qualquer estado e verificar que o rodapé informa a medição de uso anônima junto do aviso de processamento local, sem nenhum aviso bloqueando a interface.

**Acceptance Scenarios**:

1. **Given** o editor aberto, em qualquer estado, **When** o usuário olha o rodapé, **Then** é informado de que o uso do site é medido de forma anônima e de que o conteúdo dos arquivos nunca sai do navegador.
2. **Given** o primeiro acesso ao editor, **When** a página abre, **Then** nenhum aviso, banner ou diálogo de consentimento é exibido, e a medição começa normalmente.
3. **Given** tela estreita ou tema claro/escuro, **When** o usuário vê o rodapé, **Then** o aviso de medição continua legível e não causa rolagem horizontal.

---

### Edge Cases

- Bloqueador de anúncios, rede corporativa que bloqueia o Google ou ausência de internet: a medição falha em silêncio; nenhuma funcionalidade do editor é afetada e nenhuma mensagem de erro é exibida.
- Ações em sequência rápida (ex.: navegar por 50 erros com "próximo erro"): cada execução gera um evento, sem travar a interface.
- Arquivo grande (100.000 linhas): a medição não acrescenta atraso perceptível à importação, validação ou exportação.
- Nome de arquivo com CPF, CNPJ ou nome de cliente: o nome nunca é enviado, nem como parâmetro de evento, nem no título ou no endereço da página.
- Edição de linha: o evento indica apenas que uma linha foi atualizada e o tipo de registro, nunca o valor antes ou depois.
- Mensagens de erro de validação: podem ser contadas, mas o texto enviado nunca inclui o valor encontrado no campo.
- Usuário que bloqueia cookies ou usa navegação privada: a medição segue o comportamento padrão do Google Analytics nesses casos; o editor não é afetado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST registrar visitas na propriedade do Google Analytics de ID `G-TKLBD459FS`.
- **FR-002**: O sistema MUST registrar visitas e eventos somente no site publicado; ambientes de desenvolvimento, pré-visualização local e testes automatizados MUST NOT enviar dados à propriedade.
- **FR-003**: Falha ao carregar ou enviar a medição (bloqueio, falta de rede, lentidão do serviço) MUST NOT impedir, atrasar perceptivelmente ou exibir erro em nenhuma funcionalidade do editor.
- **FR-004**: As regras de segurança do site que hoje impedem qualquer conexão externa MUST ser ajustadas para liberar apenas os endereços necessários à medição do Google Analytics, mantendo todo o resto bloqueado.
- **FR-005**: O sistema MUST registrar um evento distinto para cada uma destas ações: importar arquivo; colar conteúdo; abrir o gerador de massa; gerar massa de testes; atualizar linha; descartar edição; recalcular totalizadores; ir ao próximo erro; exportar (concluído e cancelado, com a extensão escolhida); copiar conteúdo; substituir conteúdo (confirmado e cancelado); resolver edições pendentes (atualizar, descartar, cancelar); trocar tema; alternar quebra de linha; acionar o link de referência ao manual; acionar o link de feedback.
- **FR-006**: Os eventos MAY conter apenas metadados não identificáveis: tipo de layout, direção (remessa/retorno), serviço do lote, tipo de segmento, quantidade de linhas, quantidade de erros, opções do gerador e resultado da ação (concluída/cancelada).
- **FR-007**: O sistema MUST NOT enviar ao Google Analytics, em nenhum evento, parâmetro, título ou endereço de página: nome do arquivo, conteúdo de linhas ou campos, valores, documentos (CPF/CNPJ), nomes, agências, contas, códigos de barras, chaves Pix ou texto de mensagens de validação com valores encontrados.
- **FR-008**: O sistema MUST desativar na propriedade recursos de publicidade e personalização de anúncios (sinais do Google), usando a medição apenas para estatística de uso.
- **FR-009**: A medição MUST estar sempre ativa no site publicado, desde o carregamento da página; o sistema MUST NOT exibir aviso, banner ou diálogo de consentimento, nem oferecer opção de recusa dentro do editor.
- **FR-010**: O rodapé MUST informar, junto do aviso "Processado só no seu navegador", que o uso do site é medido de forma anônima e que o conteúdo dos arquivos nunca sai do navegador, em todos os estados do editor, nos temas claro e escuro e em telas estreitas.

### Key Entities

- **Visita**: abertura do editor publicado por um usuário; tem origem do acesso, dispositivo, navegador e localização aproximada, conforme coleta padrão do Google Analytics.
- **Evento de ação**: registro de uma ação do usuário; tem nome da ação, resultado (concluída/cancelada) e metadados não identificáveis de FR-006.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das ações listadas em FR-005, quando executadas no site publicado sem bloqueio da medição, aparecem no relatório em tempo real do Google Analytics em até 1 minuto.
- **SC-002**: Em uma auditoria de todos os eventos enviados durante um roteiro que importa, edita, gera e exporta um arquivo com dados fictícios conhecidos, nenhum valor do arquivo aparece em nenhum dado enviado.
- **SC-003**: Com o Google bloqueado ou sem internet, 100% dos testes de ponta a ponta do editor continuam passando e nenhuma mensagem de erro aparece ao usuário.
- **SC-004**: O tempo para abrir, validar e exportar um arquivo de 100.000 linhas não aumenta mais de 5% com a medição ativa.
- **SC-005**: Nenhuma visita ou evento é registrado a partir de ambientes de desenvolvimento ou testes automatizados.
- **SC-006**: Em até 30 dias após a publicação, o criador do site consegue responder com dados quais são as 3 ações mais usadas no editor.

## Assumptions

- A propriedade `G-TKLBD459FS` já existe, pertence ao criador do site e é configurada no painel do Google Analytics por ele (retenção de dados, filtros, relatórios); essa configuração fica fora do escopo, exceto o que FR-008 pede.
- A tag fornecida é a base, mas não é colada literalmente: as regras de segurança do site bloqueiam scripts embutidos e conexões externas, então a mesma configuração é aplicada de forma compatível com elas (FR-004).
- "Todas as ações" significa as ações do usuário listadas em FR-005, não cada tecla digitada, rolagem ou movimento do mouse; digitar em um campo não gera evento, só a atualização da linha.
- Os nomes dos eventos e parâmetros seguem o padrão do Google Analytics (minúsculas, separados por sublinhado) e ficam documentados no plano para o criador montar os relatórios.
- O título e o endereço da página são fixos ("CNAB Editor" e a raiz do site); o editor não muda de endereço ao abrir arquivos, então nada do arquivo aparece neles.
- A coleta padrão do Google Analytics (dispositivo, navegador, localização aproximada por IP) é aceitável; o Google Analytics 4 não armazena endereços IP completos.
- O Princípio V da constituição se refere ao conteúdo dos arquivos; a medição de uso sem dados dos arquivos é compatível com ele, desde que o usuário seja informado (FR-010).
- Por decisão do criador do site (2026-10-23), a medição é sempre ativa, só com aviso no rodapé (opção C), sem coleta de consentimento. O criador assume a avaliação jurídica dessa escolha perante a LGPD; mudar para consentimento prévio depois é uma nova feature.
