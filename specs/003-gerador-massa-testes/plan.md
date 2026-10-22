# Implementation Plan: Gerador de Massa de Testes CNAB 240

**Branch**: `003-gerador-massa-testes` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-gerador-massa-testes/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

O editor ganha um botão "Gerar massa de testes", no cabeçalho e na tela vazia, que abre uma modal. Nela o usuário escolhe:
- a direção (remessa ou retorno);
- as variações de segmento, cada uma com sua quantidade;
- opcionalmente, o Código do Banco na Compensação e a agência/conta da empresa.

O sistema gera um arquivo CNAB 240 completo e válido e o carrega no quadro principal.

**Abordagem técnica**:
- **Metadados no layout**: um `generation.json` por layout, ao lado das definições, descreve o catálogo de variações (direções, dependências, header e valores de lote), os campos da empresa e a estratégia de valor por nota FEBRABAN.
- **Motor puro** (`src/core/generate`): monta cada linha a partir das regras `match` da própria definição e dessas estratégias, com PRNG semeado. Os totalizadores vêm do `recalculateTotals` existente.
- **Execução**: a geração roda num Web Worker, e o texto resultante entra pelo mesmo caminho da janela "Colar conteúdo" (`fromPastedText`).

O validador existente é o oráculo: um teste de propriedade gera cada variação em cada direção e exige 0 erros. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (target ES2022); Node.js 22 só para build e testes.

**Primary Dependencies**: as da feature 001 (Preact 10 + @preact/signals, Vite 6; dev: Vitest 3, happy-dom, @testing-library/preact, Playwright, Ajv). **Nenhuma dependência nova**: o PRNG (mulberry32), os geradores de CPF/CNPJ e código de barras e as listas de nomes são implementação própria e curta (research G5).

**Storage**: N/A. As escolhas da modal não são persistidas, e o conteúdo gerado segue as regras do documento: nunca persistido.

**Testing**: Vitest (unidade, propriedade sobre todas as variações, golden, integridade de metadados, componente) e Playwright (E2E das histórias 1, 2, 3 e 5; `@perf` com 10k e 100k linhas).

**Target Platform**: navegadores desktop modernos, os mesmos da 001; publicação estática.

**Project Type**: aplicação web estática de página única (client-only), a mesma da 001.

**Performance Goals**:
- Até 10.000 linhas no quadro em ≤ 3 s; até 100.000 linhas em ≤ 15 s (SC-003).
- Nenhuma tarefa longa > 200 ms na thread principal durante a geração (meta da 001).
- A estimativa de linhas na modal é atualizada em ≤ 50 ms por alteração.

**Constraints**:
- Processamento 100% local, sem requisições (FR-032).
- Valores monetários em BigInt.
- Saída só com charset FEBRABAN em ISO-8859-1.
- Nenhuma posição de campo no código do gerador (Princípio I).
- Saída determinística com `seed` e data fixas.

**Scale/Scope**:
- ~50 variações selecionáveis em ~12 grupos.
- Até 10.000 por variação.
- Arquivo limitado a 999.999 registros (tamanho do campo do Trailer de Arquivo).
- 1 modal, 2 pontos de entrada.

Nenhum NEEDS CLARIFICATION pendente; as decisões estão em [research.md](research.md) G1–G12.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Pré-pesquisa | Pós-design | Evidência |
|---|---|---|---|
| **I. Layout como Dado** | ⚠️ O gerador precisa saber direções, dependências, lotes e campos da empresa, que não estão no layout | ✅ Tudo em `generation.json` (dado do layout, com schema); linhas identificadas pelas regras `match` das definições; banco por `bankFieldId`; totais por `totals[]`; o motor só conhece nomes de estratégia genéricos (FR-004, FR-026a) | research G1, G2, G8, G9; [contracts/generation-metadata.schema.json](contracts/generation-metadata.schema.json) |
| **II. Round-Trip sem Perdas** | ✅ A geração cria conteúdo novo; não edita arquivo existente | ✅ A massa entra como conteúdo colado (`origin = "paste"`), e a exportação usa a regra já existente (ISO-8859-1, CRLF), sem caminho novo de escrita; totais em BigInt | research G6, G7 |
| **III. Validação Explícita e Não Destrutiva** | ✅ Dados do usuário aplicados só nos campos declarados | ✅ Valores do usuário completados com `padValue` só por ação explícita; o arquivo gerado passa pelo validador normal (nada é escondido); substituir conteúdo exige confirmação | research G4, G12; data-model §2 |
| **IV. Test-First com Golden Files** | ✅ | ✅ TDD; teste de propriedade em todas as variações × direções; golden files gerados com semente fixa; integridade de metadados; E2E e perf | research G11; [quickstart.md](quickstart.md) |
| **V. Privacidade e Processamento Local** | ✅ | ✅ Dados 100% fictícios (listas embutidas, CPF/CNPJ aleatórios); worker sem rede; nada persistido; campos `sensitive` continuam mascarados em logs | research G5, G7 |
| **Restrições** (charset FEBRABAN, 100k linhas, YAGNI) | ✅ | ✅ Saída em maiúsculas sem acento; geração no worker; zero dependências novas | research G5, G7 |

**Resultado**: PASS. O alerta do Princípio I foi resolvido no design com metadados declarativos; Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/003-gerador-massa-testes/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # G1–G12
├── data-model.md        # GenerationMeta, GenerationConfig, catálogo inicial, invariantes
├── quickstart.md
├── contracts/
│   ├── generation-metadata.schema.json
│   ├── core-api.md
│   └── ui-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks (não criado aqui)
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── types.ts                         # + GenerationMeta e afins; LayoutDefinition.generation?
│   └── generate/                        # NOVO, puro (contracts/core-api.md)
│       ├── rng.ts                       # mulberry32 + helpers (pick, int, digits)
│       ├── strategies.ts                # inscricao (DV), codigoBarras44, pixKey, datas, nomes, ...
│       ├── catalog.ts                   # buildCatalog, dependents
│       ├── selection.ts                 # toggleVariant, setQuantity, changeDirection, validateConfig
│       ├── plan.ts                      # planGeneration (lotes, estimativa, limite)
│       └── build.ts                     # generateMassa: monta linhas, aplica empresa/banco, recalculateTotals
├── layouts/
│   ├── assemble.ts                      # anexa generation.json
│   ├── loader.ts / node-loader.ts       # excluem generation.json das definições de registro
│   └── febraban-cnab240-v10.11/
│       └── generation.json              # NOVO (data-model §1 e §3)
├── workers/
│   ├── generation-runner.ts             # NOVO (testável)
│   └── generation.worker.ts             # NOVO (cola)
└── ui/
    ├── App.tsx                          # + <GeneratorDialog />
    ├── state/
    │   ├── generator.ts                 # NOVO: generatorOpen, config, issues, run(), worker
    │   └── document.ts                  # replaceOrConfirm com condição/mensagem por chamador
    └── components/
        ├── Header.tsx                   # + botão "generate"
        ├── MainPane.tsx                 # + botão "generate-empty"
        ├── Icon.tsx                     # + ícone "wand"
        └── dialogs/
            ├── GeneratorDialog.tsx      # NOVO (contracts/ui-contract.md)
            └── ReplaceContentDialog.tsx # mensagem vinda de pendingReplace

scripts/
└── validate-layout.ts                   # + valida generation.json com o schema da 003

tests/
├── unit/generate/                       # rng, strategies, catalog, selection, plan, build, generate-all-variants, generation-integrity
├── golden/febraban-cnab240-v10.11/valid/gerador-remessa.rem, gerador-retorno.ret (+ .expected.json)
├── component/GeneratorDialog.test.tsx
└── e2e/generator.spec.ts                # + caso @perf em perf.spec.ts
```

**Structure Decision**: o projeto continua único e client-only.
- O gerador é um submódulo de `src/core` (puro, testável em Node, usado pelo worker), assim como `validate/`.
- O que é específico do layout fica em `src/layouts/<layout>/generation.json`.
- `src/ui` só orquestra a modal e o estado.
- `scripts/generate-golden.ts` e `scripts/generate-perf-files.ts` podem, depois, passar a usar `generateMassa`. Isso não está no escopo; é registrado como oportunidade.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
