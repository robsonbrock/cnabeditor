# Feature Specification: Gerador de Massa de Testes CNAB 240

**Feature Branch**: `003-gerador-massa-testes`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description (com os termos dos campos conforme o manual FEBRABAN CNAB 240 v10.11): "Gerador de massa de testes: o usuário escolhe quais tipos de registros quer gerar numa modal que apresenta a lista de todos os tipos de segmentos em checkboxes (ao menos 1 obrigatório), um campo inteiro com a quantidade de registros por segmento (opcional, padrão 10, máx. 10.000), o Código do Banco na Compensação (G001: código fornecido pelo Banco Central para identificação do Banco que está recebendo ou enviando o arquivo; opcional, ex.: 033) e a Agência Mantenedora da Conta (G008), o Número da Conta Corrente (G010) e seus dígitos verificadores (G009, G011, G012) da empresa, em campos separados e não obrigatórios. Quando preenchidos, todos os registros gerados devem usar os dados informados."

## Clarifications

### Session 2026-10-22

- Q: Como os segmentos aparecem na lista da modal? → A: Uma opção por variação do layout (ex.: "Segmento A", "Segmento A (Débito em Conta Corrente)", "Segmento J-52 Pix", "Segmento N (DARF)"), agrupadas pelo serviço do lote (ex.: "Pagamentos (Títulos de Cobrança e QR Code Pix)", "Cobrança", "Débito em Conta Corrente").
- Q: Como tratar segmentos que dependem de outro (B e C depois de A, Q depois de P, J-52 depois de J)? → A: O segmento principal é incluído automaticamente, e o usuário é avisado de que algo dependente está sendo incluído.
- Q: O que é o "banco destino"? → A: Simplificado: a modal tem um único campo "Código do Banco na Compensação", aplicado ao código do banco de todas as linhas do arquivo. Não há campo de banco de débito separado.
- Q: Para onde vai o conteúdo gerado? → A: Substitui o conteúdo do quadro principal, como se tivesse sido importado.
- Q: A quantidade é um campo único ou um por segmento? → A: Um campo por segmento marcado, cada um com padrão 10 e máximo 10.000.
- Q: Onde se aplicam agência e conta informadas? → A: Simplificado: são a agência e a conta da empresa mantenedora (agência, DV, conta, DV, DV agência/conta), aplicadas em todo registro que traz a conta da própria empresa: Header de Arquivo, Headers de Lote, detalhes como E, H (consignação), P, T e Y-50 ("Agência Mantenedora da Conta") e trailers de lote de conciliação e gestão de caixa. Contas de terceiros (favorecido ou pagador, ex.: Segmento A) não são afetadas.
- Q: Onde fica o botão que abre o gerador? → A: No cabeçalho da página, ao lado de "Colar conteúdo", e na tela vazia do quadro principal, junto de "Importar arquivo" e "Colar conteúdo".
- Q: Como são os demais dados gerados? → A: Válidos e variados: valores fictícios aleatórios que passam em todas as validações do editor.
- Q: Remessa, retorno ou escolha do usuário? → A: O usuário escolhe na modal; a lista de segmentos se ajusta à escolha.
- Q: Que nomes aparecem na lista? → A: Os nomes oficiais do manual FEBRABAN, como transcritos na definição de layout: o título de cada segmento (ex.: "Segmento A", "Segmento N (DARF)", "Segmento A (Débito em Conta Corrente)") dentro do serviço do seu lote (título do Header de Lote, ex.: "Pagamentos (Crédito em Conta, Cheque, OP, DOC, TED, PIX ou Pagamento com Autenticação)").
- Q: Ao marcar um segmento, a quantidade fica vazia ou preenchida? → A: Preenchida com 10.
- Q: De qual segmento os Segmentos W e W1 (FGTS) dependem? → A: Do Segmento O.
- Q: E se o usuário reduzir a quantidade do principal abaixo da de um dependente? → A: Vale sempre o maior: o principal volta para a maior quantidade entre os dependentes, com aviso.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gerar uma massa de testes com os segmentos escolhidos (Priority: P1)

Um analista precisa de um arquivo CNAB 240 para testar um sistema que processa remessas de pagamento. Ele abre a modal "Gerar massa de testes", escolhe "Remessa", marca "Segmento A" (no serviço "Pagamentos (Crédito em Conta, Cheque, OP, DOC, TED, PIX ou Pagamento com Autenticação)") e "Segmento J" (no serviço "Pagamentos (Títulos de Cobrança e QR Code Pix)"), deixa a quantidade padrão (10) e confirma. O sistema monta um arquivo completo (Header de Arquivo, um lote por tipo de serviço com seu header e trailer, os detalhes e o Trailer de Arquivo) e o carrega no quadro principal, onde o analista pode inspecionar, editar e exportar com os recursos que o editor já tem.

**Why this priority**: É o núcleo da funcionalidade. Sozinha, já elimina a montagem manual de arquivos de teste, que hoje exige contar posições e calcular totais à mão.

**Independent Test**: Abrir a modal, marcar um segmento, confirmar e verificar que o quadro principal recebe um arquivo com a estrutura completa, a quantidade pedida de detalhes e nenhum erro de validação.

**Acceptance Scenarios**:

0. **Given** o editor aberto, com ou sem conteúdo, **When** o usuário olha o cabeçalho da página, **Then** vê o botão "Gerar massa de testes", com ícone, logo após "Colar conteúdo" e no mesmo estilo; com o quadro principal vazio, a tela vazia também oferece "Gerar massa de testes" junto de "Importar arquivo" e "Colar conteúdo".
1. **Given** o editor aberto, **When** o usuário aciona "Gerar massa de testes" (pelo cabeçalho ou pela tela vazia), **Then** abre uma modal com o seletor Remessa/Retorno (Remessa marcado), a lista de segmentos agrupada por tipo de serviço, nenhum segmento marcado, os campos de Código do Banco na Compensação e de agência/conta da empresa vazios e o botão "Gerar" desabilitado.
2. **Given** a modal aberta, **When** o usuário marca "Segmento A", **Then** o campo de quantidade ao lado do segmento fica ativo com o valor 10 e o botão "Gerar" fica habilitado.
3. **Given** "Segmento A" e "Segmento J" marcados com quantidade 10 cada, **When** o usuário aciona "Gerar", **Then** o quadro principal recebe um arquivo com 1 Header de Arquivo, 2 lotes (um de pagamento por crédito com 10 detalhes A e um de pagamento de títulos com 10 detalhes J), cada lote com seu header e trailer, e 1 Trailer de Arquivo.
4. **Given** um arquivo gerado, **When** o editor valida o conteúdo, **Then** nenhuma linha apresenta erro: tamanho de linha, tipos de campo, valores permitidos, datas, sequência de registros, numeração sequencial e totalizadores dos trailers estão corretos.
5. **Given** um arquivo gerado, **When** o usuário seleciona qualquer linha, **Then** o quadro de edição mostra os campos daquela linha como mostraria num arquivo importado, e o indicador do quadro principal mostra "Remessa" ou "Retorno" conforme a escolha feita na modal.
6. **Given** um arquivo gerado, **When** o usuário compara dois detalhes do mesmo segmento, **Then** os dados variáveis (nomes, documentos, valores, datas, números de documento) diferem entre si.
7. **Given** a geração concluída, **When** o conteúdo é carregado, **Then** um toast de sucesso informa o total de linhas geradas e a modal fecha.

---

### User Story 2 - Fixar banco e conta da empresa em todo o arquivo (Priority: P1)

O analista está homologando a integração com um banco específico (ex.: Santander, 033) e com a conta da empresa mantenedora. Ele informa na modal o Código do Banco na Compensação e a agência e a conta da empresa. O arquivo gerado traz esses dados em todas as posições correspondentes, e os demais campos continuam com dados fictícios.

**Why this priority**: Uma massa de testes só serve para homologação se carregar o banco e a conta reais do cenário testado; sem isso o usuário teria de editar cada linha à mão.

**Independent Test**: Gerar uma massa informando o banco 033 e uma agência/conta; conferir que todas as linhas trazem 033 nas posições 1–3 e que todo campo de agência/conta da empresa (headers, detalhes e trailers) traz os valores informados.

**Acceptance Scenarios**:

1. **Given** a modal com Código do Banco na Compensação `033` e um segmento marcado, **When** o usuário gera a massa, **Then** o código do banco em todas as linhas do arquivo (Header de Arquivo, headers, detalhes e trailers de lote, Trailer de Arquivo) é `033`.
2. **Given** a modal com agência, conta e dígitos verificadores da empresa informados, **When** o usuário gera a massa, **Then** esses valores aparecem nos campos de agência e conta da empresa do Header de Arquivo e de todos os Headers de Lote.
2a. **Given** a modal com agência e conta da empresa informadas e "Segmento P" marcado, **When** o usuário gera a massa, **Then** a "Agência Mantenedora da Conta", a conta e os dígitos de cada detalhe P trazem os valores informados; o mesmo vale para os demais registros que trazem a conta da empresa (ex.: E, H (Empréstimo por Consignação/Retenção), T, Y-50 e trailers de lote de conciliação e gestão de caixa).
3. **Given** a modal com agência e conta da empresa informadas e "Segmento A" marcado, **When** o usuário gera a massa, **Then** a agência e a conta do favorecido ("Ag. Mantenedora da Cta do Favor.") continuam com dados fictícios variados; o mesmo vale para contas de pagador e de cliente debitado.
4. **Given** a modal sem código do banco e sem agência/conta, **When** o usuário gera a massa, **Then** esses campos são preenchidos com dados fictícios válidos, iguais em todo o arquivo.
5. **Given** o campo Código do Banco na Compensação, **When** o usuário digita algo que não é um número de 3 dígitos (ex.: `33`, `AB1`), **Then** o campo é sinalizado como inválido com a regra violada e o botão "Gerar" fica desabilitado até a correção ou o esvaziamento do campo.
6. **Given** os campos de agência ou conta, **When** o usuário informa mais dígitos que o tamanho do campo no layout ou caracteres não permitidos, **Then** o campo é sinalizado como inválido e o botão "Gerar" fica desabilitado.

---

### User Story 3 - Segmentos dependentes incluídos com aviso (Priority: P2)

O analista quer testar o envio de dados do pagador na cobrança e marca apenas "Segmento Q" no serviço "Cobrança". Como o Segmento Q só existe acompanhando um P, o sistema marca "Segmento P" automaticamente e mostra um aviso explicando que o P foi incluído porque o Q depende dele. Cada conjunto gerado sai na ordem certa (P seguido de Q).

**Why this priority**: Evita que o usuário gere arquivos estruturalmente inválidos sem perceber, mas o gerador já entrega valor sem isso para segmentos independentes.

**Independent Test**: Marcar apenas um segmento dependente, verificar o aviso e a marcação automática do principal, gerar e conferir a ordem dos registros em cada conjunto.

**Acceptance Scenarios**:

1. **Given** a modal aberta, **When** o usuário marca "Segmento Q", **Then** "Segmento P" é marcado automaticamente e um aviso junto à lista informa: "Segmento P foi incluído porque Segmento Q depende dele".
2. **Given** "Segmento Q" marcado e "Segmento P" incluído automaticamente, **When** o usuário tenta desmarcar P, **Then** o sistema não desmarca e explica que P é necessário enquanto Q estiver marcado.
3. **Given** "Segmento Q" marcado e "Segmento P" incluído automaticamente, **When** o usuário desmarca Q, **Then** P também é desmarcado, a não ser que o usuário o tenha marcado por conta própria antes.
4. **Given** "Segmento P" com quantidade 10 e "Segmento Q" com quantidade 5, **When** o usuário gera a massa, **Then** o lote tem 10 conjuntos iniciados por P, dos quais 5 seguidos de Q.
5. **Given** "Segmento P" com quantidade 5, **When** o usuário informa 8 em "Segmento Q", **Then** a quantidade de P passa a 8 e o sistema avisa que a quantidade do principal foi ajustada para acompanhar o dependente.
5a. **Given** "Segmento P" com 8 e "Segmento Q" com 8, **When** o usuário informa 3 em "Segmento P", **Then** a quantidade de P volta para 8 (a maior entre os dependentes) e o sistema avisa que o principal não pode ter menos registros que o seu dependente.
6. **Given** "Segmento A", "Segmento B" e "Segmento C" marcados com quantidade 10, **When** o usuário gera a massa, **Then** cada um dos 10 conjuntos sai na ordem A, B, C.

---

### User Story 4 - Gerar massa de retorno (Priority: P2)

O analista precisa testar o processamento de arquivos que o banco devolve. Ele escolhe "Retorno" na modal; a lista passa a mostrar só os segmentos que existem em retorno (ex.: "Segmento T", "Segmento U", "Segmento E (Extrato para Conciliação Bancária)") e os arquivos gerados saem marcados como retorno, com códigos de ocorrência e campos preenchidos pelo banco.

**Why this priority**: Amplia o gerador para o outro lado da integração; a remessa já cobre a maior parte do uso.

**Independent Test**: Escolher Retorno, marcar um segmento exclusivo de retorno, gerar e verificar que o indicador mostra "Retorno" e que não há erros de validação.

**Acceptance Scenarios**:

1. **Given** a modal com Remessa selecionado, **When** o usuário troca para Retorno, **Then** a lista mostra apenas os segmentos válidos em retorno, e segmentos marcados que não existem em retorno são desmarcados com um aviso listando quais foram removidos.
2. **Given** Retorno selecionado e "Segmento T" marcado, **When** o usuário gera a massa, **Then** o Header de Arquivo indica Retorno, o indicador do quadro principal mostra "Retorno" e os detalhes trazem códigos de movimento de retorno válidos.

---

### User Story 5 - Proteção do conteúdo atual (Priority: P3)

O analista está com um arquivo aberto e edições pendentes e abre o gerador por engano ou sem lembrar delas. Antes de substituir o quadro principal, o sistema pede confirmação.

**Why this priority**: Evita perda de trabalho, mas só importa quando já há conteúdo carregado.

**Independent Test**: Carregar um arquivo, editar um campo sem atualizar a linha, gerar uma massa e verificar que o sistema pede confirmação antes de substituir.

**Acceptance Scenarios**:

1. **Given** o quadro principal com conteúdo, **When** o usuário aciona "Gerar" na modal, **Then** o sistema avisa que o conteúdo atual será substituído e oferece confirmar ou cancelar.
2. **Given** o aviso de substituição, **When** o usuário cancela, **Then** a modal continua aberta com as escolhas feitas, e o quadro principal permanece como estava.
3. **Given** o quadro principal vazio, **When** o usuário aciona "Gerar", **Then** o conteúdo é carregado sem pedir confirmação.
4. **Given** a modal aberta com escolhas feitas, **When** o usuário fecha a modal sem gerar, **Then** nada muda no quadro principal.

---

### Edge Cases

- Nenhum segmento marcado: o botão "Gerar" fica desabilitado e a modal indica que é preciso marcar ao menos um segmento.
- Quantidade vazia num segmento marcado: vale o padrão 10.
- Quantidade 0, negativa, decimal, não numérica ou acima de 10.000: o campo é sinalizado como inválido com a regra violada (inteiro de 1 a 10.000) e o botão "Gerar" fica desabilitado.
- Total de linhas estimado acima do limite do Trailer de Arquivo (999.999 registros): a modal mostra o total estimado, informa o limite e mantém "Gerar" desabilitado até que as quantidades sejam reduzidas.
- Total de linhas estimado acima de 100.000: a modal mostra o total estimado e avisa que a geração pode demorar; o usuário pode gerar mesmo assim.
- Agência/conta da empresa parcialmente preenchida (ex.: agência sem conta): cada campo informado é aplicado e os não informados são gerados com dados fictícios.
- Segmento cujo serviço exige um header de lote diferente de outro segmento marcado: cada um vai para o seu próprio lote.
- Segmentos que usam o mesmo Header de Lote mas exigem formas de lançamento diferentes (ex.: "Segmento N (DARF)", forma 16, e "Segmento O", forma 11): saem em lotes separados, porque o lote é homogêneo por tipo de operação, serviço e forma de lançamento.
- Falha inesperada durante a geração: nada é carregado no quadro principal, a modal permanece aberta e um toast de erro informa que a massa não foi gerada.

## Requirements *(mandatory)*

### Functional Requirements

**Modal e escolhas**

- **FR-001**: O sistema MUST oferecer um botão "Gerar massa de testes", com ícone, no cabeçalho da página logo após "Colar conteúdo" e no mesmo estilo, sempre disponível; com o quadro principal vazio, a tela vazia MUST oferecer o mesmo botão junto de "Importar arquivo" e "Colar conteúdo", com o texto "Importe um arquivo CNAB 240 (.rem, .ret ou .txt), cole o conteúdo ou gere uma massa de testes.". O botão abre a modal de configuração.
- **FR-002**: A modal MUST ter um seletor Remessa/Retorno, com Remessa selecionado por padrão.
- **FR-003**: A modal MUST listar, em checkboxes, cada variação de segmento de detalhe definida no layout ativo que seja válida para a direção escolhida (ex.: "Segmento A", "Segmento A (Débito em Conta Corrente)", "Segmento J-52 Pix", "Segmento N (DARF)"), agrupadas pelo serviço do lote (ex.: "Pagamentos (Tributos e Contas)", "Cobrança", "Débito em Conta Corrente", "Custódia de Cheques", "Vendor", "Compror / Compror Rotativo"), com os nomes oficiais do manual FEBRABAN conforme transcritos na definição de layout. Ficam de fora apenas as variações que a definição de layout declarar como excluídas da geração, cada uma com o motivo registrado.
- **FR-004**: A lista de segmentos MUST vir da definição de layout ativa, de modo que uma nova variação de segmento no layout apareça na modal sem mudança no gerador.
- **FR-005**: O sistema MUST exigir ao menos um segmento marcado para habilitar a geração.
- **FR-006**: Cada segmento marcado MUST ter um campo de quantidade próprio, ativo só enquanto o segmento estiver marcado, preenchido com 10 ao marcar o segmento, que aceita inteiros de 1 a 10.000 e usa 10 se o usuário o esvaziar.
- **FR-007**: A modal MUST ter um campo opcional "Código do Banco na Compensação" que aceita exatamente 3 dígitos.
- **FR-008**: A modal MUST ter campos opcionais e separados para a conta da empresa mantenedora: agência, DV da agência, conta, DV da conta e DV agência/conta, cada um limitado ao tamanho e tipo do campo correspondente no layout.
- **FR-009**: Campos da modal com valor inválido MUST ser sinalizados com a regra violada logo abaixo deles, e o botão "Gerar" MUST ficar desabilitado enquanto houver campo inválido.
- **FR-010**: A modal MUST mostrar o total estimado de linhas do arquivo a ser gerado, atualizado a cada mudança de segmento ou quantidade.

**Dependências entre segmentos**

- **FR-011**: Ao marcar um segmento que depende de outro (ex.: B e C de A, Q/R/S de P, J-52/J-53 de J, W e W1 de O, conforme o layout), o sistema MUST marcar automaticamente o segmento principal e exibir um aviso dizendo qual segmento foi incluído e por quê.
- **FR-012**: Um segmento principal incluído automaticamente MUST NOT poder ser desmarcado enquanto algum dependente dele estiver marcado; ao desmarcar o último dependente, o principal MUST ser desmarcado se não tiver sido marcado pelo usuário.
- **FR-013**: A quantidade do segmento principal MUST ser sempre a maior entre a sua e a de seus dependentes. Quando o usuário informar no dependente um valor maior, ou no principal um valor menor que o de algum dependente, o sistema MUST ajustar o principal para o maior valor e avisar.
- **FR-014**: Cada conjunto gerado MUST seguir a ordem do layout (principal seguido de seus dependentes, ex.: A, B, C); se o dependente tiver quantidade menor que o principal, apenas os primeiros conjuntos recebem o dependente.

**Estrutura e conteúdo gerado**

- **FR-015**: O arquivo gerado MUST conter Header de Arquivo, um ou mais lotes (cada um com seu Header de Lote, detalhes e Trailer de Lote) e Trailer de Arquivo, com cada linha no tamanho do layout.
- **FR-016**: Segmentos que usam o mesmo Header de Lote com os mesmos valores de identificação do lote (tipo de operação, tipo de serviço, forma de lançamento e versão do layout do lote) MUST sair no mesmo lote; qualquer diferença nesses valores MUST gerar lotes separados.
- **FR-017**: Numeração de lote, sequencial de registro no lote, quantidades e somatórios dos trailers MUST ser coerentes com o conteúdo gerado.
- **FR-018**: Todos os campos MUST ser preenchidos com valores que passem nas validações do editor: tipo, tamanho, preenchimento (numéricos com zeros à esquerda, alfanuméricos com espaços à direita), valores permitidos, datas válidas, CPF/CNPJ com dígitos verificadores corretos.
- **FR-019**: Os dados variáveis (nomes, documentos, valores, datas, números de documento) MUST variar entre registros.
- **FR-020**: Todos os dados gerados MUST ser fictícios e válidos: produzidos aleatoriamente, sem consultar nenhuma fonte de dados reais de pessoas ou empresas, e aprovados nas mesmas regras de validação de um dado real (CPF/CNPJ com dígitos verificadores corretos, códigos de barras com DV correto, datas existentes, CEP e UF bem formados).
- **FR-021**: Os dados da empresa (inscrição, nome, convênio) MUST ser os mesmos em todo o arquivo.
- **FR-022**: Texto alfanumérico gerado MUST seguir a convenção FEBRABAN: maiúsculas e sem acentuação.
- **FR-023**: Em Retorno, o arquivo MUST trazer o código de remessa/retorno de retorno e os campos preenchidos pelo banco (códigos de ocorrência, datas de efetivação etc.) com valores válidos.

**Dados informados pelo usuário**

- **FR-024**: Quando informado, o Código do Banco na Compensação MUST ser usado no código do banco de todas as linhas do arquivo.
- **FR-025**: Quando informados, agência, DV da agência, conta, DV da conta e DV agência/conta da empresa MUST ser usados em todos os campos que representam a conta da própria empresa, em qualquer tipo de registro: Header de Arquivo, Headers de Lote, detalhes (ex.: E, H (Empréstimo por Consignação/Retenção), P, T, Y-50) e trailers de lote (ex.: conciliação, gestão de caixa).
- **FR-026**: Os dados informados na modal MUST NOT alterar campos de agência ou conta de terceiros (favorecido, pagador, cliente debitado, ex.: Segmento A), que continuam com dados fictícios variados.
- **FR-026a**: A distinção entre conta da empresa e conta de terceiro MUST vir da definição de layout, não de uma lista fixa no gerador.
- **FR-027**: Campos de banco e conta da empresa não informados MUST ser gerados com dados fictícios válidos, iguais em todo o arquivo.

**Carga no editor**

- **FR-028**: O conteúdo gerado MUST substituir o conteúdo do quadro principal e ficar disponível para seleção, edição, cópia e exportação como um arquivo importado.
- **FR-029**: Se o quadro principal tiver conteúdo, o sistema MUST pedir confirmação antes de substituí-lo; cancelar MUST manter a modal aberta com as escolhas feitas e o quadro principal intacto.
- **FR-030**: Ao concluir, o sistema MUST fechar a modal e exibir um toast de sucesso com o total de linhas geradas; em falha, MUST manter a modal aberta, não alterar o quadro principal e exibir um toast de erro com o motivo.
- **FR-031**: O conteúdo gerado MUST ser exportado com quebra de linha CRLF e codificação ISO-8859-1, as mesmas regras do conteúdo colado.
- **FR-032**: A geração MUST acontecer localmente, sem enviar escolhas ou conteúdo a serviços externos.

### Key Entities

- **Configuração de geração**: o que o usuário escolheu na modal: direção (Remessa/Retorno), segmentos marcados com suas quantidades, Código do Banco na Compensação e conta da empresa (agência, DV, conta, DV, DV agência/conta), todos opcionais exceto a lista de segmentos.
- **Variação de segmento**: uma definição de detalhe do layout (ex.: "Segmento N (DARF)"), com nome oficial vindo do título transcrito do manual, o serviço do lote a que pertence, a direção em que existe, o segmento principal de que depende (se houver) e o tipo de Header de Lote que exige.
- **Conjunto de detalhe**: um registro principal seguido dos dependentes gerados para ele (ex.: P + Q + R).
- **Massa gerada**: o arquivo resultante, com Header de Arquivo, lotes e Trailer de Arquivo, carregado no quadro principal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos arquivos gerados, para qualquer combinação de segmentos, direção e dados informados, abrem no editor sem nenhum erro de validação.
- **SC-002**: Um usuário consegue gerar uma massa com dois segmentos, banco e agência/conta da empresa informados em menos de 1 minuto a partir do editor aberto.
- **SC-003**: Uma massa de até 10.000 linhas fica disponível no quadro principal em até 3 segundos; uma de até 100.000 linhas, em até 15 segundos, sem travar a interface.
- **SC-004**: Quando o Código do Banco na Compensação ou a agência/conta da empresa são informados, 100% das linhas e campos previstos trazem exatamente os valores informados.
- **SC-005**: Em 100% dos casos em que um segmento dependente é marcado sozinho, o principal é incluído e o aviso é exibido antes da geração.
- **SC-006**: Nenhum arquivo gerado contém CPF/CNPJ com dígito verificador inválido ou registros consecutivos com os mesmos dados variáveis.

## Assumptions

- O gerador usa o layout ativo do editor (FEBRABAN CNAB 240 v10.11); só aparecem na lista as variações de segmento que esse layout define.
- A direção em que cada variação existe (remessa, retorno ou ambas) e as dependências entre segmentos seguem o manual FEBRABAN v10.11; quando o layout ainda não registrar essas informações, elas serão acrescentadas à definição de layout, não ao gerador.
- Segmentos de registros iniciais/finais de lote (tipos 2 e 4, ex.: saldos de gestão de caixa) entram automaticamente quando o lote os exige; não aparecem como opção na lista.
- Datas geradas: a data de geração é a data atual; datas de vencimento e pagamento caem nos 60 dias seguintes; datas de retorno (efetivação, ocorrência) caem nos 30 dias anteriores.
- Valores monetários gerados ficam entre R$ 1,00 e R$ 50.000,00, com centavos.
- Quando os dígitos verificadores de agência ou conta não forem informados, são gerados como um dígito fictício, já que o cálculo varia por banco e o layout FEBRABAN não o define.
- A exportação da massa segue a regra de nome que o editor já usa (`cnabeditor_AAAAMMDDHHMMSS.rem` ou `.ret`, conforme a direção detectada).
- Hoje a definição de layout não marca explicitamente quais campos de agência/conta são da empresa e quais são de terceiros (os nomes variam: "Agência Mantenedora da Conta" × "Ag. Mantenedora da Cta do Favor."); essa marcação será acrescentada à definição de layout.
- As escolhas da modal não são lembradas entre aberturas; a modal sempre abre com os valores padrão.
- Gerar com dados propositalmente inválidos (para testar rejeições) está fora de escopo; o usuário pode editar a massa gerada no editor para isso.
