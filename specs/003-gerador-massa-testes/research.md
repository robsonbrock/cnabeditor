# Research: Gerador de Massa de Testes CNAB 240

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data**: 2026-10-22

A stack é a da feature 001 ([../001-cnab240-editor/research.md](../001-cnab240-editor/research.md) R1): TypeScript + Preact/signals + Vite, motor puro em `src/core`, layout em JSON em `src/layouts`. Esta pesquisa cobre apenas o que o gerador acrescenta.

## G1. Onde ficam os metadados de geração

**Decision**: Um arquivo novo `src/layouts/febraban-cnab240-v10.11/generation.json`, validado por um schema próprio ([contracts/generation-metadata.schema.json](contracts/generation-metadata.schema.json)). O `assembleLayout` o anexa como `LayoutDefinition.generation` (opcional). Os carregadores (`loader.ts`, `node-loader.ts`) deixam de tratá-lo como definição de registro.

O arquivo declara:
- Por serviço (grupo = um Header de Lote) e por variação de detalhe selecionável: direções em que existe, segmento principal de que depende e valores de identificação do lote. Os nomes exibidos não ficam no arquivo: vêm dos títulos oficiais já transcritos no layout (`title` do Header de Lote e do detalhe).
- Quais campos representam a empresa (FR-021, FR-025, FR-026a).
- A estratégia de valor por nota FEBRABAN (G001, G006, G063…).

**Rationale**:
- Princípio I: o motor do gerador não conhece segmentos, serviços nem posições; tudo isso vem do layout.
- Os JSON de registro continuam sendo transcrição fiel do manual. O que é decisão do gerador (dependências, forma de lançamento escolhida) fica separado e não suja a definição usada por parser e validador.
- Um layout sem `generation.json` simplesmente não oferece o gerador; nada quebra.

**Alternatives considered**:
- Atributos novos em cada campo dos ~90 JSON de registro (`party`, `generate`): mistura transcrição e política de geração e multiplica a edição.
- Tabela fixa no código do gerador: viola o Princípio I e FR-004/FR-026a.

## G2. Identificar o registro gerado sem posições no código

**Decision**: Cada linha nasce "em branco" e preenchida pelas regras `match` da própria definição: `equals` grava o valor, `in` grava o primeiro da lista. Regras `{ batch: … }` são satisfeitas pelo header de lote escolhido. Exemplos: Tipo de Registro "3", Segmento "J", "52" nas pos. 18–19 do J-52.

Depois disso, o gerador confirma com `matchRecord` (de `src/core/resolve.ts`) que a linha montada resolve para a definição pretendida. Se não resolver, é erro de metadados e o teste da variação falha.

**Rationale**: reaproveita a mesma fonte de verdade que o parser usa para reconhecer linhas. Uma linha gerada sempre é reconhecida como a variação escolhida.

Caso conhecido: J-52 e J-52 Pix diferem só pela pos. 132 (COVERAGE.md). O J-52 Pix precisa de uma chave Pix cujo 1º caractere não seja 0/1/2/3/9. A estratégia `pixKey` gera chaves aleatórias (EVP) iniciadas por letra, e a verificação por `matchRecord` garante o resultado.

## G3. Agrupamento em lotes

**Decision**: Cada grupo declara `header` (id do Header de Lote) e cada variação declara `batch.values` (valores por id de campo do header: tipo de operação, tipo de serviço, forma de lançamento, versão do layout do lote). A chave do lote é `header + values`, e variações com chave igual vão para o mesmo lote (FR-016). A ordem dos lotes segue a ordem dos grupos no `generation.json`.

Registros iniciais e finais de lote (tipos 2 e 4, ex.: saldos de gestão de caixa) entram quando a variação declara `batch.initial` / `batch.final`.

**Rationale**:
- Os headers de pagamento se distinguem pela forma de lançamento (`header-lote-pagamento-credito` × `-titulos` × `-tributos`, pos. 12–13).
- No manual, um lote é homogêneo por operação/serviço/forma. Exemplo: N–DARF (forma 16) e O (forma 11) vão para lotes diferentes, e a spec foi ajustada (FR-016).
- O `trailer-lote-pagamento-tributos` exige versão do lote 010/011/012, então a versão também faz parte da chave.

**Alternatives considered**: agrupar só pelo id do header. Gera lotes que o próprio validador aceita, mas que o banco rejeitaria por mistura de formas de lançamento.

## G4. Estratégias de valor

**Decision**: Cada campo recebe valor por esta precedência:

1. **Identificação**: valor imposto pelas regras `match` (G2) e pela chave do lote (G3).
2. **Dado do usuário**:
   - Código do Banco na Compensação em todo campo da nota G001 que seja o banco do arquivo (G9).
   - Agência e conta nos campos marcados como da empresa (G8).
3. **Controle**:
   - Lote de serviço (G002), sequencial no lote (G038) e Código Remessa/Retorno (G015) pela direção.
   - Data e hora de geração (G016/G017).
   - Totalizadores: calculados depois, por `recalculateTotals` (G6).
4. **Estratégia por nota** (`generation.json › strategies`). Um nome de estratégia genérica do motor por referência FEBRABAN:

   | Estratégia | Notas FEBRABAN |
   |---|---|
   | `inscricao` (par tipo + número, CPF/CNPJ com DV) | G005/G006 |
   | `agencia`, `conta`, `dv` | G008–G012 |
   | `nomePessoa` / `nomeEmpresa` | G013 |
   | `valor` (R$ 1,00–50.000,00) | G042, G070… |
   | `dataFutura` / `dataPassada` | G044, C012, C056… |
   | `codigoBarras44` (DV módulo 11) | G063 |
   | `pixKey` | G102 + G103 |
   | `endereco`, `cidade`, `cep`, `uf` | G032–G036 |
   | `documento` (seu número / nosso número únicos) | G064, G043, C011… |
   | `porDirecao` | ocorrências G059: brancos na remessa, "00" no retorno |

5. **Domínio**: campo com `domain` recebe um valor do domínio. Se for obrigatório, escolhe ao acaso; se for opcional, também escolhe, para variar.
6. **Padrão por tipo**:
   - Campo obrigatório: valor aleatório válido do tipo (N/V dígitos, D data válida, H hora válida, A texto no charset FEBRABAN).
   - Campo opcional sem estratégia: vazio (A espaços; N/V/D zeros). O validador aceita vazio em campo opcional, e nota G004 (uso FEBRABAN) fica sempre em branco.

**Rationale**:
- Tudo que o validador checa (tipo, tamanho, domínio, data, hora, charset) é garantido por construção (SC-001).
- A variedade vem dos campos de negócio que o usuário olha: nomes, documentos, valores, datas, contas de terceiros (FR-019).
- As notas FEBRABAN são a semântica estável do layout, e o motor só conhece nomes de estratégia.

**Alternatives considered**: preencher todos os campos opcionais com lixo aleatório. Aumenta o risco de combinações inválidas entre campos (ex.: código de juros "0" com valor de juros preenchido) sem ganho para o teste.

## G5. Aleatoriedade e reprodutibilidade

**Decision**:
- Gerador pseudoaleatório pequeno e determinístico (mulberry32, ~10 linhas), semeado no navegador por `crypto.getRandomValues`.
- A semente e a data de referência ("hoje") são parâmetros de `generateMassa`. Os testes fixam as duas, o que deixa a saída reprodutível nos golden tests e nos testes de propriedade.
- Valores que precisam ser únicos no arquivo (seu número, nosso número, documentos) usam contador + parte aleatória, então nunca colidem (SC-006).

**Rationale**: `Math.random` não aceita semente, o que deixaria os testes intermitentes. Uma biblioteca (faker, chance) traria centenas de KB e dados em português que ainda precisariam de ajuste ao charset FEBRABAN (YAGNI).

**Alternatives considered**: `@faker-js/faker`, rejeitada pelo tamanho e por não respeitar o charset sem pós-processamento. Nomes e cidades vêm de listas curtas embutidas, só com maiúsculas e sem acento.

## G6. Totalizadores, sequenciais e limites

**Decision**:
- O gerador escreve lote, sequencial e contagens enquanto monta.
- Ao final, aplica `recalculateTotals` (já existente em `src/core/validate/totals.ts`) sobre o documento gerado, que preenche somatórios e quantidades declarados em `totals[]`.
- O limite de linhas (FR-010, edge case de 999.999) vem do tamanho do campo `countRecords` do Trailer de Arquivo, lido da definição (10^tamanho − 1).
- A estimativa de linhas é calculada antes de gerar, pela mesma função que planeja os lotes:
  `2 + Σ lotes (2 + iniciais + finais + Σ conjuntos)`.

**Rationale**: uma única implementação de totais (a do validador) garante que o arquivo gerado nunca diverge do que o editor espera, e nada é posicional.

## G7. Onde a geração roda

**Decision**:
- A geração roda num Web Worker dedicado (`src/workers/generation.worker.ts`), com a lógica separada em `generation-runner.ts`, como já é feito na validação. O worker devolve o texto completo, com CRLF entre registros e CRLF final.
- A thread principal carrega o texto com `fromPastedText`, o mesmo caminho da janela "Colar conteúdo". Assim ficam valendo origin "paste", exportação ISO-8859-1 e CRLF (FR-031) e todo o pipeline de resolução/validação, sem código novo.

**Rationale**:
- Uma estimativa com 100.000 linhas × ~30 campos leva centenas de ms. Na thread principal isso estoura a meta da 001 (nenhuma tarefa longa > 200 ms) e SC-003.
- O worker importa o layout estaticamente, como o de validação; não há rede (Princípio V).

**Alternatives considered**: gerar na thread principal em fatias com `setTimeout`. Exige reentrância e cancelamento manuais, e o worker já tem precedente no projeto.

## G8. Campos da empresa (FR-021, FR-025, FR-026a)

**Decision**: `generation.json › company` define o que é dado da empresa:

- `kinds`: tipos de registro cujos campos de inscrição, convênio, agência, conta e nome (por nota: G005–G013) são sempre da empresa. Valores: `fileHeader`, `batchHeader`.
- `records`: lista explícita de ids de campo por definição, para detalhes e trailers que trazem a conta da empresa:
  - `segmento-e-conciliacao`, `segmento-h-consignacao`, `segmento-p-cobranca`, `segmento-t-cobranca`, `segmento-y-50-cobranca`;
  - `trailer-lote-conciliacao`, `trailer-lote-gestao-caixa`.

O gerador sorteia um único "perfil da empresa" por arquivo e o aplica a todos esses campos. Os dados informados na modal sobrescrevem as partes correspondentes do perfil. Contas de terceiros, como a "Ag. Mantenedora da Cta do Favor." do Segmento A, seguem a estratégia normal e variam.

**Rationale**: as mesmas notas G008–G013 servem para empresa e terceiros, e só a definição sabe quem é quem. A marcação é dado do layout (FR-026a), conferido por teste contra o nome do campo ("Agência Mantenedora da Conta").

## G9. Código do Banco na Compensação

**Decision**:
- `generation.json › bankFieldId` = `"codigoBanco"`. O layout já usa esse id (nota G001) em todas as 89 definições de registro, e o valor informado vai nesse campo em todas as linhas (FR-024).
- Sem banco informado, o perfil da empresa sorteia um código fictício de 3 dígitos, igual em todo o arquivo.
- Outros campos com nota G001 são de terceiros e seguem a estratégia normal:
  - `segmento-k-vendor.bancoDebito`;
  - `segmento-r-cobranca.bancoDebito`;
  - `segmento-y-50-cobranca.bancoBeneficiario`.

  O mesmo vale para P002 ("Código do Banco do Favorecido").
- Um teste de integridade exige que toda definição tenha o campo `bankFieldId`.

**Rationale**: a seleção é por id declarado no layout, não por posição, e o levantamento sobre os JSON atuais mostrou que o id é uniforme.

## G10. Direção (remessa/retorno) e dependências

**Decision**:
- Cada variação declara `directions` (`remessa`, `retorno` ou ambas) e `requires` (id da variação principal, opcional).
- A lista da modal (FR-003) filtra por direção.
- A inclusão automática (FR-011–FR-013) e a ordem dos conjuntos (FR-014) seguem `requires`.
- A tabela inicial, transcrita do manual v10.11, está em [data-model.md §3](data-model.md). Cada linha da tabela vira um caso do teste de propriedade da G11.

**Rationale**: só o manual sabe que T/U são retorno e P/Q são remessa. Embutir isso no código violaria o Princípio I.

## G11. Estratégia de testes (Princípio IV)

**Decision**:

- **Teste de propriedade** (`tests/unit/generate-all-variants.test.ts`): gera cada variação selecionável, em cada direção em que existe, com 3 sementes e quantidade 3. Em cada caso:
  - passa o resultado pelo validador completo (registro, estrutura, totais) e exige 0 erros (SC-001);
  - confere a resolução de cada linha para a variação pretendida.
- **Unidade**:
  - CPF/CNPJ com DV (SC-006), código de barras com DV, `pixKey` sem 0/1/2/3/9 inicial;
  - planejamento de lotes e dependências (FR-011–FR-016), estimativa e limite;
  - aplicação de banco e conta (FR-024–FR-027).
- **Golden**: um arquivo gerado com semente e data fixas em `tests/golden/febraban-cnab240-v10.11/valid/gerador-*.rem/.ret`. Ele protege contra mudanças involuntárias de formato.
- **Integridade de metadados**:
  - `generation.json` valida contra o schema;
  - todo id citado existe no layout;
  - toda variação de detalhe do layout aparece no catálogo ou está explicitamente excluída;
  - todo campo "Agência Mantenedora da Conta" de detalhe está em `company.records`.
- **Componente** (`GeneratorDialog`): estados do botão Gerar, aviso de dependência, quantidade padrão/limites, filtro por direção.
- **E2E** (Playwright): o fluxo das histórias 1, 2, 3 e 5. O `@perf` cobre 10.000 e 100.000 linhas (SC-003).

## G12. Confirmação de substituição

**Decision**:
- O gerador reaproveita `pendingReplace`/`ReplaceContentDialog`, mas com uma condição própria: pede confirmação sempre que o quadro tiver conteúdo (FR-029), não só quando há alterações. A mensagem do diálogo passa a vir do pedido ("O conteúdo atual do quadro principal será substituído pela massa gerada").
- Cancelar mantém a modal do gerador aberta (diálogos nativos empilhados).
- O documento gerado nasce com `hasUnexportedChanges = true`. Assim, importar ou colar algo por cima dele também pede confirmação, porque a massa ainda não foi salva.

**Alternatives considered**: um diálogo de confirmação novo, que duplicaria um componente que já existe.
