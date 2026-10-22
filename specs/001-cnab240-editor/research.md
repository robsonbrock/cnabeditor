# Research: Editor CNAB 240

**Feature**: `001-cnab240-editor` | **Date**: 2026-10-22 | **Plan**: [plan.md](plan.md)

Cada item resolve um ponto em aberto do Technical Context ou uma escolha de tecnologia/padrão.

---

## R1. Stack e modelo de distribuição (TODO(TECH_STACK) da constituição)

- **Decision**: Aplicação web estática (SPA de página única), em **TypeScript 5.x**, com build por **Vite 6**, interface em **Preact 10 + @preact/signals**, executada inteiramente no navegador e publicada como arquivos estáticos (qualquer host estático ou servidor interno). Node.js 22 LTS só para build e testes.
- **Rationale**: FR-001/FR-033 pedem página sem login e sem servidor de processamento; um bundle estático elimina backend. TypeScript dá tipagem ao modelo de layout e ao motor. Preact (~4 KB) oferece o modelo de componentes do React com custo mínimo; signals permitem atualizar só a linha/campo afetado sem re-render do quadro de 100.000 linhas. Vite traz Web Workers e build de produção sem configuração extra.
- **Alternatives considered**:
  - *Vanilla TS sem framework*: menor dependência, mas a sincronização manual de estado entre quadro principal, quadro de edição, painel de detalhes, contador de erros e toasts tende a gerar bugs; rejeitado.
  - *React 19*: equivalente funcionalmente, ~10× maior; sem ganho para este escopo.
  - *Svelte/SvelteKit*: bom desempenho, mas adiciona compilador próprio e a equipe teria um paradigma a mais; sem necessidade demonstrada.
  - *Desktop (Electron/Tauri)*: contraria "página única de acesso livre"; rejeitado.

## R2. Leitura de bytes, encoding e round-trip byte a byte (FR-025, SC-002, Princípio II)

- **Decision**:
  1. Importação lê o arquivo como `ArrayBuffer` (`File.arrayBuffer()`), nunca como texto.
  2. Detecção de encoding: tentar `new TextDecoder('utf-8', { fatal: true })`; se decodificar **e** houver byte ≥ 0x80, o encoding é `utf-8`; caso contrário, é `iso-8859-1`.
  3. ISO-8859-1 é decodificado por função própria (byte → `String.fromCharCode(byte)`), não por `TextDecoder('iso-8859-1')`, porque o WHATWG mapeia esse rótulo para windows-1252 e quebraria a ida e volta de 0x80–0x9F.
  4. O modelo guarda, por registro, o conteúdo original e o terminador original. Na exportação, registros não alterados são re-encodados a partir do texto original; como a decodificação é bijetiva nos dois encodings aceitos, o resultado é idêntico byte a byte. Um teste de propriedade garante `encode(decode(bytes)) === bytes` para todos os 256 valores de byte em ISO-8859-1.
  5. Um BOM UTF-8 inicial é preservado como atributo do arquivo (não entra no texto do primeiro registro) e reescrito na exportação.
- **Rationale**: Ler como texto perde informação (normalização de quebras, substituição de bytes inválidos). A decodificação latin1 manual é trivialmente reversível.
- **Alternatives considered**: guardar o `ArrayBuffer` original e fazer *patch* de bytes nas linhas editadas — mais rápido para o caso sem edição, mas duplica a fonte da verdade e complica a edição em UTF-8 (posições de caractere ≠ posições de byte). Rejeitado em favor de "texto + encoding + terminadores", que já é exato.
- **Nota UTF-8**: em arquivos UTF-8, as posições dos campos são contadas em caracteres; linhas com acentos terão mais de 240 bytes e a validação sinaliza os caracteres fora do conjunto esperado (edge case "caracteres acentuados"), sem converter nada (FR-021).

## R3. Quebras de linha mistas e quebra final (FR-025, FR-025a, edge cases)

- **Decision**: o divisor de registros reconhece `\r\n`, `\n` e `\r` isolado e guarda **por registro** o terminador encontrado (`"CRLF" | "LF" | "CR" | ""`). A presença de quebra final é o terminador do último registro. Conteúdo vindo de arquivo: exporta cada registro com seu terminador original. Conteúdo vindo de "Colar conteúdo": todo terminador não vazio vira `CRLF`; o último registro mantém ausência/presença de quebra.
- **Rationale**: preserva arquivos com quebras mistas sem heurística; FR-025a vira uma regra de serialização simples.
- **Detalhe do textarea**: o valor de `<textarea>` normaliza quebras para `\n` (spec HTML). Isso é compatível com FR-006b porque a quebra de linha do conteúdo colado é sempre reescrita como CRLF na exportação; os demais caracteres (incluindo espaços finais e linhas só de espaços) passam sem alteração — nenhum `trim()` em nenhum ponto do pipeline (regra de lint/teste dedicada, ver R13).
- **Arquivo vazio**: conteúdo de comprimento zero → zero registros; exportar/copiar desabilitados. Um único `\n` → um registro vazio com terminador `LF` (preservado).

## R4. Encoding na exportação de conteúdo colado (FR-025b)

- **Decision**: varredura prévia dos registros procurando code points > 0xFF; se houver, um diálogo lista a quantidade e (linha, posição) de cada ocorrência (limitado às 50 primeiras na tela, com total) e exige confirmação. O encoder ISO-8859-1 grava `?` (0x3F) para cada caractere não representável. Code points fora do BMP (pares substitutos, ex.: emoji) contam como **um** caractere, iterando por code point (`for…of`), para manter 1 byte por posição.
- **Rationale**: atende ao "1 byte por posição" da clarificação. O quadro principal não é alterado.
- **Alternatives considered**: `TextEncoder` só gera UTF-8; bibliotecas de encoding (iconv-lite) são desnecessárias para um único charset de 1 byte.

## R5. Definição declarativa do layout FEBRABAN CNAB 240 v10.11 (Princípio I)

- **Decision**: layout em arquivos **JSON** versionados em `src/layouts/febraban-cnab240-v10.11/`, validados por um **JSON Schema** ([contracts/layout-definition.schema.json](contracts/layout-definition.schema.json)) no CI e carregados pelo motor em tempo de build (import estático). Estrutura:
  - `layout.json`: metadados (nome, versão `10.11`, data `2023-08-21`, URL da fonte), tabelas de domínio compartilhadas (ex.: Tipo de Registro 0–9, Tipo de Inscrição, Código de Movimento por serviço).
  - Um arquivo por definição de registro: `header-arquivo.json`, `trailer-arquivo.json`, `header-lote-<servico>.json`, `trailer-lote-<servico>.json`, `segmento-<letra>[-<variante>].json`.
  - Cada definição de registro tem `id`, `label` (rótulo curto do quadro: `HA`, `HL`, `A`, `TL`, `TA`…), `title` ("Detalhe – Segmento P"), `match` (regras declarativas de identificação, ver R6), `fields[]` e, para trailers de lote, `totals[]` (ver R8).
  - Cada campo: `id`, `name`, `start`, `end`, `type` (`N` numérico, `A` alfanumérico, `D` data DDMMAAAA, `H` hora HHMMSS, `V` valor), `decimals`, `required`, `description`, `domain` (lista inline ou referência a tabela compartilhada), `reference` (nota do manual, ex.: "G001"), `default` opcional para brancos/zeros.
  - `size` é derivado (`end - start + 1`) e verificado pelo schema/teste; os campos de cada registro precisam cobrir 1–240 sem buracos nem sobreposição (teste de integridade de layout).
- **Rationale**: JSON é consumível por motor, validador, UI e testes sem código; o schema impede definições inconsistentes. Adicionar uma versão ou layout de banco = nova pasta + golden files.
- **Alternatives considered**: YAML (mais legível, mas exige parser em runtime ou passo de build); TypeScript com objetos literais (tipado, mas mistura dado e código e facilita lógica embutida — contraria o Princípio I).
- **Transcrição**: os dados são transcritos do PDF oficial (FR-028), com a nota de referência do manual em cada campo. A completude por serviço é rastreada num checklist em `src/layouts/febraban-cnab240-v10.11/COVERAGE.md` e cada definição tem ao menos um golden file (Princípio IV). Escopo da transcrição: todos os serviços e segmentos do manual (Assumptions da spec), priorizando na ordem: Header/Trailer de Arquivo → Pagamentos (A, B, C, J, J-52, N, O, W, Z) → Cobrança (P, Q, R, S, T, U, Y) → Débito Automático e demais.

## R6. Identificação do tipo de registro e do segmento (FR-007, FR-009a, FR-010)

- **Decision**: resolução em duas passadas, guiada pelo `match` de cada definição:
  1. **Tipo de Registro** = posição 8 (`0` HA, `1` HL, `3` Detalhe, `5` TL, `9` TA; `2`/`4` registros iniciais/finais de lote, quando definidos; outros → não reconhecido).
  2. **Contexto do lote**: ao encontrar um Header de Lote, o resolvedor guarda os discriminadores do lote (Tipo de Operação pos. 9, Tipo de Serviço pos. 10–11, Versão do layout do lote pos. 14–16). Detalhes e Trailer de Lote seguintes herdam esse contexto até o próximo HL/TL.
  3. **Detalhe**: Código Segmento = posição 14; variantes (ex.: J-52, Y-xx) usam campos adicionais declarados no `match` (ex.: "Identificação Registro Opcional", pos. 18–19).
  4. `match` é uma lista de condições `{ "pos": [start, end], "equals" | "in": … }` sobre a própria linha e `{ "batch": "<discriminador>", "in": [...] }` sobre o contexto do lote. Vence a definição com mais condições satisfeitas; empate ou nenhuma → "Registro não reconhecido" com rótulo `?` e um único campo bruto 1–N (FR-023, edge case).
  - **Remessa/Retorno**: Header de Arquivo pos. 143 (`1` remessa, `2` retorno; outro → "Não identificado"). Se a primeira linha não é Header de Arquivo, procura-se o primeiro registro com pos. 8 = `0`.
- **Rationale**: o mesmo segmento muda de significado conforme o serviço do lote; o contexto de lote é a forma prevista no manual. Manter a regra no `match` evita posições hardcoded no motor.
- **Rótulo do quadro**: para detalhes, o rótulo é o caractere da pos. 14 da linha (o próprio Código Segmento), mesmo quando a variante não é reconhecida.

## R7. Tipos de campo, contador e preenchimento (FR-011, FR-015, FR-017, FR-018, Assumptions)

- **Decision**:
  - `N`/`V`/`D`/`H`: apenas dígitos `0–9`; preenchimento com zeros à esquerda. `V` tem `decimals` implícitos (sem separador). `D` aceita `00000000` quando o campo não é obrigatório; caso contrário valida dia/mês/ano reais (calendário gregoriano, ano 4 dígitos). `H` valida 00–23/00–59/00–59.
  - `A`: qualquer caractere; validação sinaliza caracteres fora do conjunto FEBRABAN recomendado (maiúsculas sem acento, dígitos, espaço e pontuação básica) como **aviso de conteúdo**, sem converter (FR-021).
  - **Contador "preenchido/total"**: `N/V/D/H` → comprimento após remover zeros à esquerda (valor todo zero conta 0); `A` → comprimento após remover espaços à direita. Total = `size`.
  - **Momento da validação** (clarificação): regras `length` e `charset/type` rodam no `input` (cada tecla); `domain` e `date/time` rodam no `blur`. No `blur` todas as regras são reavaliadas (FR-015b).
  - **Serialização** ("Atualizar linha"): valor do campo ajustado ao `size` — `N/V/D/H` com `padStart('0')`, `A` com `padEnd(' ')`. Valores já com o tamanho exato passam intactos. Nada é truncado: a caixa de texto já bloqueia além do tamanho (`maxlength` + filtro em `beforeinput` para colagem).
  - **Campo não editado**: se o valor da caixa é idêntico ao trecho da linha, o trecho é reaproveitado sem passar pelo pad (garante FR-019 mesmo em campos que originalmente não seguem o padrão, ex.: numérico com espaços).
- **Rationale**: regra única por tipo, dirigida pela definição; pad só aplicado ao que o usuário mudou.

## R8. Totalizadores e "Recalcular totais" (FR-023a–c, Princípio II)

- **Decision**:
  - O Trailer de Lote de cada serviço declara `totals[]`: `{ "field": "<id do campo no trailer>", "kind": "count" | "sum", "source": { "records": ["<ids de definição>"], "field": "<id do campo de valor>" } }`. `count` sem `source` = quantidade de registros do lote incluindo HL e TL (regra do manual).
  - O Trailer de Arquivo declara `count` de lotes e de registros (incluindo HA e TA).
  - Somas usam **`BigInt`** sobre a string de dígitos (sem ponto flutuante; campos de 18 dígitos excedem 2^53). Resultado formatado com zeros à esquerda; se exceder o tamanho do campo, o recálculo **não** grava e reporta erro de estouro.
  - Estrutura inválida (lote sem TL, registros fora de lote, sem TA): recalcula só os trailers existentes; o agrupamento usa a sequência HL…TL e o campo "Lote de Serviço" (pos. 4–7) como critério auxiliar; a validação sinaliza a estrutura.
  - O resultado do recálculo é uma lista `{ line, recordTitle, fieldName, from, to }` exibida ao usuário; linhas alteradas recebem o indicador "alterada" (FR-009c).
  - Sequencial de registro no lote não é recalculado (Assumptions); apenas validado.
- **Rationale**: dado declarativo + BigInt atende ao Princípio I e à proibição de float.

## R9. Desempenho com 100.000 linhas (SC-005, SC-005a, edge case)

- **Decision**:
  - **Quadro principal virtualizado**: só as linhas visíveis (+ margem) existem no DOM. Implementação própria (~150 linhas) com altura de linha calculada: modo sem quebra → altura fixa; modo com quebra → `ceil(len / colunasVisíveis) × alturaDaLinha` com fonte monoespaçada e largura medida uma vez por resize (prefix-sum de alturas recalculado em O(n) só em resize/troca de modo/carga).
  - **Parse** na thread principal (split + resolução de tipo ≈ dezenas de ms para 100k linhas).
  - **Validação do arquivo inteiro** (campos, sequência, trailers) num **Web Worker**, em lotes com publicação incremental do resultado; a UI exibe "validando…" no contador até concluir. A validação da linha editada roda síncrona na thread principal (uma linha ≈ < 1 ms).
  - Estado de linhas em `Uint8Array` de flags (alterada, com erro) indexado por número de linha, para que o quadro virtual consulte flags em O(1) sem objetos por linha.
- **Rationale**: o DOM é o gargalo (100k × 240 caracteres); a virtualização resolve. Worker mantém a rolagem fluida durante a validação inicial.
- **Alternatives considered**: `@tanstack/virtual-core` (bom, mas medição dinâmica por DOM é desnecessária quando a altura é calculável; uma dependência a menos — YAGNI); `<textarea>` readonly (não permite rótulos, indicadores, seleção de linha nem virtualização; rejeitado); validação síncrona fatiada com `setTimeout` (viável, mas compete com a rolagem; Worker é nativo no Vite e sem dependência).
- **Metas**: 10k linhas carregadas e exibidas ≤ 3 s (meta interna ≤ 1 s); seleção de linha → campos ≤ 200 ms (meta interna ≤ 50 ms); validação por tecla ≤ 200 ms (meta interna ≤ 16 ms); 100k linhas com rolagem a 60 fps sem tarefas longas > 200 ms na thread principal.

## R10. Preferências no navegador (FR-029–FR-032, FR-034)

- **Decision**: `localStorage`, chave única `cnabeditor.prefs.v1`, JSON com `{ theme, wrap, splitMainPct, splitRightPct }` ([contracts/preferences.md](contracts/preferences.md)). Toda leitura/escrita em `try/catch`; JSON inválido ou valores fora de faixa → padrões. Gravação ao soltar a divisória (não a cada `pointermove`). Nenhum conteúdo de arquivo é persistido (nem em `sessionStorage`, IndexedDB ou cache).
- **Rationale**: dados pequenos e síncronos; navegação privada continua funcionando com padrões.

## R11. Divisórias redimensionáveis (FR-029, FR-030)

- **Decision**: componente `Splitter` próprio com Pointer Events (`setPointerCapture`), posições em porcentagem do contêiner (sobrevivem a resize da janela), mínimos em pixels por quadro (principal ≥ 320 px, lista de campos ≥ 160 px, detalhes ≥ 120 px, lado direito ≥ 360 px), acessível via teclado (`role="separator"`, `aria-valuenow`, setas movem 2%). Padrões: principal 55%, painel de detalhes 45% da altura direita ("pouco menos da metade").
- **Alternatives considered**: bibliotecas de split-pane — dependência para ~80 linhas de código; rejeitado.

## R12. Toasts, diálogos, cópia e download (FR-035, FR-036, FR-027, FR-024)

- **Decision**:
  - **Diálogos** (Colar conteúdo, edições pendentes, confirmar exportação com erros, escolher extensão, caracteres fora de ISO-8859-1, resultado do recálculo): elemento nativo `<dialog>` com `showModal()` (foco preso e `Esc` nativos).
  - **Toasts**: região `aria-live="polite"` empilhada, cada toast com temporizador próprio de 5 s (pausa nenhuma; não bloqueia cliques — `pointer-events` só no próprio toast). Sucesso e erro com cor e ícone distintos.
  - **Copiar**: `navigator.clipboard.writeText(texto)` com o conteúdo reconstituído (terminadores originais; sem rótulos); fallback `document.execCommand('copy')` num textarea oculto quando a API não existir (contexto não seguro). Confirmação visual no próprio botão ("Copiado ✓").
  - **Download**: `Blob` com bytes gerados + `<a download>` + `URL.revokeObjectURL`. Nome `cnabeditor_AAAAMMDDHHMMSS.<ext>` pelo relógio local (FR-024a), gerado por função pura testável com data injetada.
- **Rationale**: APIs nativas, zero dependências.

## R13. Estratégia de testes (Princípio IV)

- **Decision**:
  - **Vitest** (ambiente `node` para `src/core`, `happy-dom` para componentes) — testes unitários e de golden files.
  - **Golden files** em `tests/golden/febraban-cnab240-v10.11/{valid,invalid}/` com dados fictícios: para cada arquivo, um `*.expected.json` com tipo do arquivo, rótulos por linha, erros esperados (linha, posições, campo, regra) e, quando aplicável, totais esperados. Testes: parse, round-trip byte a byte (incluindo quebras mistas, sem quebra final, BOM, latin1 0x00–0xFF, UTF-8), validação e recálculo.
  - **Testes de integridade de layout**: cada definição cobre 1–240 sem buracos/sobreposições; `size` coerente; domínios referenciados existem; `match` sem ambiguidade entre definições do mesmo contexto.
  - **Playwright** (Chromium, Firefox, WebKit) para E2E dos cenários de aceitação, incluindo verificação de que **nenhuma requisição de rede** ocorre após o carregamento da página (SC-008) e um teste de desempenho com arquivo gerado de 10k/100k linhas.
  - **Guarda contra trim**: teste que percorre o pipeline colar → quadro → copiar/exportar com linhas de espaços finais e regra ESLint `no-restricted-properties` para `trim`, `trimEnd`, `trimStart` em `src/core` e no fluxo de conteúdo.
- **Rationale**: golden files transformam o manual em regressão; Playwright cobre interação real de teclado/foco e downloads.

## R14. Privacidade (FR-033, FR-034, SC-008, Princípio V)

- **Decision**: bundle sem chamadas de rede em runtime: fontes e ícones empacotados localmente; nenhum analytics/telemetria. `index.html` com **Content-Security-Policy** via `<meta>`: `default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; script-src 'self'` — o navegador bloqueia qualquer `fetch`/XHR acidental. O único link externo é o PDF do manual em nova aba (`rel="noopener noreferrer"`). Mensagens de erro e toasts não incluem CPF/CNPJ ou contas; logs de console (apenas em dev) mascaram campos marcados `sensitive: true` na definição de layout.
- **Rationale**: a CSP torna SC-008 verificável e impõe o Princípio V por construção.

## R15. Acessibilidade e teclado (FR-009f)

- **Decision**: quadro principal com `role="listbox"`, `aria-activedescendant` apontando para a linha selecionada (compatível com virtualização), ↑/↓ trocam a seleção (com o mesmo fluxo de edições pendentes), Home/End/PageUp/PageDown como conveniência. Campos do quadro de edição em ordem de posição no DOM para que Tab siga a ordem natural; mensagens de erro ligadas por `aria-describedby`; foco no campo atualiza o painel de detalhes.
