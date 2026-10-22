# Implementation Plan: Editor CNAB 240

**Branch**: `001-cnab240-editor` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-cnab240-editor/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Editor de página única, sem login e sem backend, para importar/colar, inspecionar campo a campo, editar com validação em tempo real, recalcular totalizadores e exportar/copiar arquivos CNAB 240 (FEBRABAN v10.11). Abordagem: SPA estática em TypeScript + Preact, com um **motor puro** (`src/core`) dirigido por uma **definição declarativa de layout em JSON** (Princípio I), round-trip byte a byte a partir de bytes lidos do arquivo com encoding e terminadores preservados por registro (Princípio II), validação em Web Worker para o arquivo inteiro e síncrona para a linha editada, quadro principal virtualizado para até 100.000 linhas, e CSP `connect-src 'none'` para garantir que nenhum conteúdo sai do navegador (Princípio V). Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (target ES2022), Node.js 22 LTS apenas para build/testes

**Primary Dependencies**: Preact 10 + @preact/signals (UI e estado reativo); Vite 6 (build, dev server, Web Worker). Dev: Vitest 3, happy-dom, @testing-library/preact, Playwright, ESLint, Ajv (validação do schema de layout no CI). Sem dependências de runtime além de Preact/signals.

**Storage**: `localStorage` somente para preferências de interface (`cnabeditor.prefs.v1`); conteúdo de arquivo nunca é persistido

**Testing**: Vitest (unidade, golden files, integridade de layout, componentes) + Playwright (E2E em Chromium/Firefox/WebKit, rede zero, desempenho)

**Target Platform**: Navegadores desktop modernos (Chrome/Edge, Firefox, Safari — duas últimas versões); publicado como arquivos estáticos

**Project Type**: Aplicação web estática de página única (client-only)

**Performance Goals**: 10k linhas carregadas e exibidas ≤ 3 s; 100k linhas sem travar (sem tarefa longa > 200 ms na thread principal durante rolagem/seleção/edição); validação por tecla e ao sair do campo ≤ 200 ms; seleção de linha → campos ≤ 200 ms

**Constraints**: processamento 100% local, zero requisições após o carregamento (SC-008); round-trip byte a byte (FR-025); nenhum `trim`/normalização no fluxo de conteúdo; valores monetários sem ponto flutuante (BigInt); interface em pt-BR

**Scale/Scope**: 1 página, ~12 componentes, 1 layout (FEBRABAN CNAB 240 v10.11, todos os serviços e segmentos do manual), arquivos de até 100.000 linhas, um arquivo aberto por vez

Todos os itens resolvidos em [research.md](research.md); não há NEEDS CLARIFICATION pendente.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação (pré-pesquisa) | Avaliação (pós-design) | Evidência |
|---|---|---|---|
| **I. Layout como Dado** | ✅ Spec exige definição declarativa (Key Entities) | ✅ Layout em JSON validado por JSON Schema; motor, validador, UI e testes consomem a mesma definição; identificação de registro/segmento por `match` declarativo; totalizadores por `totals[]`; fonte normativa em `source` | [research.md R5/R6/R8](research.md), [contracts/layout-definition.schema.json](contracts/layout-definition.schema.json) |
| **II. Round-Trip sem Perdas** | ✅ FR-019, FR-025, FR-027a, SC-002 | ✅ Leitura por bytes; latin1 bijetivo próprio; terminador por registro; BOM preservado; `applyEdits` reaproveita trechos não editados; recálculo lista campos derivados alterados; BigInt para somas; registros não reconhecidos intactos | [research.md R2/R3/R7/R8](research.md), [contracts/core-api.md](contracts/core-api.md) |
| **III. Validação Explícita e Não Destrutiva** | ✅ FR-015..FR-023a, FR-026 | ✅ Erros com linha, posições, campo, encontrado, regra (`ValidationError`); sem correção automática (pad só em campo editado pelo usuário, sem truncar); exportação com erros exige confirmação; arquivo inválido continua editável | [data-model.md §2/§4](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md) |
| **IV. Test-First com Golden Files** | ✅ Independent Tests da spec baseados em arquivos de referência | ✅ TDD; golden files válidos/inválidos com `*.expected.json`; testes de parse, round-trip, validação, recálculo e integridade de layout; gate de merge `test:golden` | [research.md R13](research.md), [quickstart.md](quickstart.md) |
| **V. Privacidade e Processamento Local** | ✅ FR-033, FR-034, SC-008 | ✅ Sem backend; CSP `connect-src 'none'`; assets locais; sem telemetria; só preferências persistidas; campos `sensitive` mascarados em logs; golden files fictícios | [research.md R10/R14](research.md), [contracts/preferences.md](contracts/preferences.md) |
| **Restrições de Domínio e Tecnologia** | ⚠️ TODO(TECH_STACK) em aberto | ✅ Stack registrada aqui (R1); encoding preservado; alfanumérico gerado não é normalizado; meta de 100k linhas endereçada (R9); cada dependência justificada abaixo | [research.md R1/R9](research.md) |

**Resultado**: PASS (pré e pós-design). Nenhuma violação; Complexity Tracking vazio.

**Justificativa de dependências (YAGNI)**:
- *Preact + signals*: estado compartilhado entre 5 regiões + diálogos + toasts; atualização granular necessária para 100k linhas.
- *Vite*: build/Worker sem configuração; substitui bundler + dev server manuais.
- *Ajv* (dev): valida o schema de layout no CI — protege o Princípio I.
- Não adotados: virtualização (`@tanstack/virtual`), split-pane, toast, i18n, encoding (iconv) — implementação nativa curta é suficiente (R9, R11, R12, R4).

**Follow-up de governança**: após o merge, emendar a constituição (PATCH/MINOR via `/speckit-constitution`) substituindo `TODO(TECH_STACK)` pela stack registrada em R1.

## Project Structure

### Documentation (this feature)

```text
specs/001-cnab240-editor/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── layout-definition.schema.json
│   ├── core-api.md
│   ├── ui-contract.md
│   └── preferences.md
├── attachments/
│   └── esboco-quadro-edicao.svg
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html                         # CSP meta, ponto de montagem
package.json
vite.config.ts
tsconfig.json
vitest.config.ts
playwright.config.ts
eslint.config.js

src/
├── main.tsx                       # bootstrap
├── core/                          # motor puro, sem DOM (contracts/core-api.md)
│   ├── encoding.ts                # detecção, decode latin1/utf-8, encode com "?"
│   ├── split.ts                   # divisão em registros + terminadores
│   ├── document.ts                # decodeFile, fromPastedText, detectDirection
│   ├── resolve.ts                 # match de RecordDefinition + contexto de lote
│   ├── fields.ts                  # sliceFields, contador, applyEdits
│   ├── validate/
│   │   ├── field.ts               # length, type, domain, date, time, required, charset
│   │   ├── record.ts              # lineLength, unknownRecord
│   │   ├── structure.ts           # sequence, batchNumber, recordSequence
│   │   └── totals.ts              # totalMismatch / recalculateTotals (BigInt)
│   ├── export.ts                  # encodeForExport, toClipboardText, exportFileName
│   └── types.ts
├── layouts/
│   ├── loader.ts                  # monta LayoutDefinition a partir dos JSON
│   └── febraban-cnab240-v10.11/
│       ├── layout.json            # metadados, fonte, domínios
│       ├── header-arquivo.json
│       ├── trailer-arquivo.json
│       ├── header-lote-*.json
│       ├── trailer-lote-*.json
│       ├── segmento-*.json
│       └── COVERAGE.md            # checklist de transcrição por serviço/segmento
├── workers/
│   └── validation.worker.ts
└── ui/
    ├── App.tsx
    ├── state/                     # signals: document, selection, editSession, report, prefs, toasts
    ├── prefs.ts                   # localStorage seguro (contracts/preferences.md)
    ├── components/
    │   ├── Header.tsx
    │   ├── MainPane.tsx           # cabeçalho + VirtualLines
    │   ├── VirtualLines.tsx
    │   ├── EditPane.tsx           # lista de campos + Atualizar/Descartar
    │   ├── FieldInput.tsx
    │   ├── DetailPane.tsx
    │   ├── Splitter.tsx
    │   ├── Footer.tsx
    │   ├── Toasts.tsx
    │   └── dialogs/               # Paste, PendingEdits, ReplaceContent, Export*, Recalc
    └── styles/
        ├── tokens.css             # temas dark/light
        └── app.css

tests/
├── golden/
│   └── febraban-cnab240-v10.11/
│       ├── valid/                 # *.rem/*.ret/*.txt + *.expected.json (dados fictícios)
│       └── invalid/
├── unit/                          # core + layout-integrity.test.ts
├── component/                     # Preact + happy-dom
└── e2e/                           # Playwright: cenários de aceitação, rede zero, desempenho
```

**Structure Decision**: projeto único client-only. `src/core` é a biblioteca de domínio pura (testável em Node, reutilizada pelo Worker); `src/layouts` contém apenas dados; `src/ui` só orquestra estado e renderização. Essa separação materializa o Princípio I (nenhuma posição de campo fora de `src/layouts`) e facilita adicionar CNAB 400 ou layouts de banco no futuro como novas pastas em `src/layouts`.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
