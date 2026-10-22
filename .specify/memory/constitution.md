<!--
Sync Impact Report
- Version change: (template, unversioned) → 1.0.0
- Modified principles (placeholder → new title):
  - [PRINCIPLE_1_NAME] → I. Layout como Dado, Não como Código
  - [PRINCIPLE_2_NAME] → II. Round-Trip sem Perdas
  - [PRINCIPLE_3_NAME] → III. Validação Explícita e Não Destrutiva
  - [PRINCIPLE_4_NAME] → IV. Test-First com Arquivos de Referência (NON-NEGOTIABLE)
  - [PRINCIPLE_5_NAME] → V. Privacidade e Processamento Local
- Added sections:
  - Restrições de Domínio e Tecnologia (was [SECTION_2_NAME])
  - Fluxo de Desenvolvimento e Quality Gates (was [SECTION_3_NAME])
  - Governance rules filled in
- Removed sections: none
- Deferred TODOs:
  - TODO(TECH_STACK): stack (linguagem, framework de UI, distribuição desktop/web) ainda não
    definida; a primeira feature deve registrá-la em plan.md e, se vinculante, emendar esta seção.
-->

# CNAB Editor Constitution

## Core Principles

### I. Layout como Dado, Não como Código

- Toda definição de layout CNAB (240, 400 e variações por banco/versão/serviço) MUST ser descrita
  de forma declarativa (ex.: arquivo de definição versionado) contendo, para cada campo: nome,
  posição inicial, posição final, tamanho, tipo (numérico, alfanumérico, data, valor),
  casas decimais implícitas, obrigatoriedade e valores permitidos.
- Parser, serializador, validador e editor MUST consumir a mesma definição de layout; posições
  de campo hardcoded no código de aplicação são proibidas.
- Cada layout MUST identificar sua fonte normativa (FEBRABAN ou manual do banco, com versão).
- Suportar um novo banco ou versão de layout MUST exigir apenas uma nova definição (e seus
  arquivos de referência), sem alteração no motor.

**Rationale**: CNAB tem dezenas de variantes por banco; layout embutido no código gera
divergências entre leitura, escrita e validação e torna cada banco novo um projeto à parte.

### II. Round-Trip sem Perdas

- Abrir e salvar um arquivo sem edições MUST produzir saída byte a byte idêntica à entrada,
  incluindo encoding, terminadores de linha (CRLF/LF), espaços de preenchimento e linha final.
- Edições MUST alterar somente os bytes dos campos editados e os campos derivados declarados
  (ex.: totalizadores do trailer, sequenciais), e o editor MUST informar ao usuário quais campos
  derivados foram recalculados.
- Valores monetários MUST ser representados como inteiros (centavos) ou decimal exato;
  ponto flutuante binário é proibido em qualquer cálculo ou conversão de valor.
- Registros ou campos não reconhecidos pelo layout MUST ser preservados intactos, nunca
  descartados.

**Rationale**: arquivos CNAB são enviados a bancos e liquidam dinheiro real; uma alteração
silenciosa de um único byte pode rejeitar um lote inteiro ou causar pagamento incorreto.

### III. Validação Explícita e Não Destrutiva

- O sistema MUST validar: tamanho de linha, tipo e preenchimento de campo (numéricos com zeros
  à esquerda, alfanuméricos com espaços à direita), datas válidas, valores permitidos,
  sequência de registros (header/lotes/detalhes/trailers) e totalizadores.
- Toda falha MUST ser reportada com linha, posição inicial/final, nome do campo, valor
  encontrado e regra violada.
- O sistema MUST NOT truncar, preencher, converter caixa ou corrigir dados automaticamente sem
  ação explícita do usuário; correções sugeridas MUST ser opt-in e visíveis.
- Arquivos inválidos MUST continuar abríveis e editáveis; a validação informa, não bloqueia a
  leitura. Exportar um arquivo com erros MUST exigir confirmação explícita.

**Rationale**: o valor do editor está em encontrar e explicar problemas; corrigir em silêncio
esconde erros que o banco rejeitará depois.

### IV. Test-First com Arquivos de Referência (NON-NEGOTIABLE)

- TDD é obrigatório: testes escritos → testes falham → implementação → refatoração.
- Cada layout suportado MUST ter arquivos de referência (golden files) válidos e inválidos,
  com testes de parse, round-trip byte a byte (Princípio II) e validação (Princípio III).
- Todo bug corrigido MUST ganhar um arquivo de referência ou teste que o reproduza.
- Arquivos de referência MUST conter apenas dados fictícios ou anonimizados (Princípio V).

**Rationale**: a correção do editor só é verificável contra arquivos concretos; golden files
transformam a especificação do banco em regressão automatizada.

### V. Privacidade e Processamento Local

- Arquivos CNAB contêm dados pessoais e bancários (CPF/CNPJ, nomes, agência, conta, valores)
  protegidos pela LGPD; o conteúdo MUST ser processado localmente por padrão.
- Nenhum conteúdo de arquivo MUST ser enviado a serviço externo, telemetria ou log remoto sem
  consentimento explícito e documentado do usuário.
- Logs e mensagens de erro MUST mascarar documentos e dados de conta, exibindo apenas o
  necessário para localizar o problema.
- Dados reais de clientes MUST NOT ser versionados no repositório.

**Rationale**: o usuário confia ao editor arquivos financeiros sensíveis; vazamento é um risco
legal e de reputação maior que qualquer ganho de funcionalidade.

## Restrições de Domínio e Tecnologia

- Formatos-alvo: CNAB 240 e CNAB 400 (remessa e retorno). Outros formatos de largura fixa ficam
  fora de escopo até emenda desta constituição.
- Encoding: o padrão é ASCII/ISO-8859-1 conforme o layout; o encoding detectado ou declarado
  MUST ser preservado na gravação (Princípio II).
- Conteúdo alfanumérico gerado pelo editor SHOULD seguir a convenção FEBRABAN (maiúsculas, sem
  acentuação); dados existentes MUST NOT ser normalizados sem ação do usuário (Princípio III).
- Desempenho: arquivos com até 100.000 linhas MUST abrir, validar e salvar sem travar a
  interface; metas numéricas detalhadas são definidas no plan.md de cada feature.
- Simplicidade (YAGNI): dependências e abstrações novas MUST ser justificadas no plan.md;
  complexidade sem necessidade demonstrada é rejeitada na revisão.
- TODO(TECH_STACK): linguagem, framework de interface e modelo de distribuição ainda não foram
  definidos; a primeira feature registra a escolha no plan.md.

## Fluxo de Desenvolvimento e Quality Gates

- Toda feature segue o fluxo Spec Kit: `/speckit-specify` → `/speckit-clarify` (quando houver
  ambiguidades) → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- O plan.md de cada feature MUST conter um Constitution Check avaliando os Princípios I–V;
  violações MUST ser justificadas na tabela de Complexity Tracking ou a feature é bloqueada.
- Mudanças entram via pull request revisado; o merge exige testes passando, incluindo a suíte
  completa de round-trip de todos os layouts suportados.
- Alterações em definições de layout MUST citar a fonte normativa (manual e versão) no PR.

## Governance

- Esta constituição prevalece sobre quaisquer outras práticas do projeto. Em conflito, ela vence
  até ser emendada.
- Emendas MUST ser feitas por pull request que altera este arquivo via `/speckit-constitution`,
  descrevendo a mudança, o motivo e o impacto em specs, planos e código existentes, incluindo
  plano de migração quando houver quebra.
- Versionamento semântico da constituição:
  - MAJOR: remoção ou redefinição incompatível de princípio ou regra de governança.
  - MINOR: novo princípio/seção ou expansão material de orientação.
  - PATCH: esclarecimentos, redação e correções sem efeito semântico.
- Conformidade: toda revisão de PR MUST verificar aderência aos princípios; o
  `/speckit-analyze` SHOULD ser executado antes da implementação para detectar conflitos entre
  spec, plano, tarefas e esta constituição.

**Version**: 1.0.0 | **Ratified**: 2026-10-22 | **Last Amended**: 2026-10-22
