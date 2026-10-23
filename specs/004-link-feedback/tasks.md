---

description: "Task list for feature 004-link-feedback"
---

# Tasks: Link de Feedback

**Input**: Design documents from `/specs/004-link-feedback/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-contract.md](contracts/ui-contract.md), [quickstart.md](quickstart.md)

**Tests**: obrigatórios. O Princípio IV da constituição exige TDD: escrever os testes, confirmar que falham e só então implementar.

**Organization**: uma única história (US1, P1). Não há Setup nem Foundational: o projeto, as dependências, o ícone `external` e as regras `.app-footer a` já existem.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: história a que a tarefa pertence (US1)

---

## Phase 1: User Story 1 - Enviar feedback ao criador do site (Priority: P1) 🎯 MVP

**Goal**: link "Enviar feedback" no rodapé que abre `https://forms.gle/vtu9hDoSFQvkiWfo6` em nova aba, sem levar dados do arquivo e sem alterar o editor.

**Independent Test**: com um arquivo carregado e editado, clicar em "Enviar feedback". O formulário abre em nova aba com o endereço exato, e o editor fica como estava (quickstart Q1 e Q2).

### Tests for User Story 1 ⚠️

> **Escreva estes testes primeiro e confirme que FALHAM antes da implementação.**

- [X] T001 [P] [US1] Criar o teste de componente em `tests/component/Footer.feedback.test.tsx`, no padrão de `tests/component/Header.generate.test.tsx`. Usar `beforeEach` com `resetDocumentState()` e `layout.value = febrabanCnab240`, e renderizar `<Footer />` de `src/ui/components/Footer.tsx`. Casos:
  - (a) `screen.getByTestId("feedback-link")` é um `<a>` com `textContent` "Enviar feedback" e contém `[data-icon=external]` (FR-006).
  - (b) `href` é exatamente `"https://forms.gle/vtu9hDoSFQvkiWfo6"`, comparado com o literal e com `FEEDBACK_URL` importado de `Footer.tsx`; `target` é `"_blank"` e `rel` é `"noopener noreferrer"` (FR-002, FR-003, FR-005).
  - (c) `aria-label` e `title` são ambos `"Enviar feedback (abre o formulário em nova aba)"` (FR-007).
  - (d) Está dentro de `.footer-meta` e é o último filho, logo depois do `<span>` que contém `[data-testid=manual-link]`.
  - (e) Com um documento carregado (`setDocument(fromPastedText(...))` com uma linha de um golden file de `tests/golden/febraban-cnab240-v10.11/valid/`), o `href` é idêntico ao do caso vazio e não contém `?`, `#` nem `=` (FR-004).
- [X] T002 [P] [US1] Criar o E2E em `tests/e2e/feedback.spec.ts` usando `golden`, `importFile`, `row` e `fieldInput` de `tests/e2e/helpers.ts`. O `beforeEach` faz `page.goto("/")`.
  - No início do teste, interceptar o formulário com `context.route("https://forms.gle/**", r => r.fulfill({ status: 200, contentType: "text/html", body: "<title>form</title>" }))` para não depender da internet.
  - Preparar o editor: `importFile(page, golden("valid/pagamento-remessa.rem"))`, `row(page, 3).click()` e `fieldInput(page, "valorPagamento").fill("999")`, sem confirmar a linha.
  - Guardar o texto de `line-count` e o valor do campo.
  - Fazer `const popup = context.waitForEvent("page")`, clicar em `feedback-link`, aguardar o popup e verificar que `popup.url()` é `"https://forms.gle/vtu9hDoSFQvkiWfo6"`.
  - Na aba original, verificar que `line-count`, `row(page, 3)` com `aria-selected="true"` e `fieldInput(page, "valorPagamento")` com valor "999" não mudaram (FR-003, SC-003).
  - Segundo teste: com a viewport em 375×800, `feedback-link` está visível, fica dentro do rodapé e não alarga a página além do que o cabeçalho já alarga (Edge Case de tela estreita). O cabeçalho já passa de 375 px antes desta feature (716 px no Chromium); corrigir isso fica fora do escopo.

### Implementation for User Story 1

- [X] T003 [US1] Em `src/ui/components/Footer.tsx` (depende de T001 e T002):
  - Adicionar `export const FEEDBACK_URL = "https://forms.gle/vtu9hDoSFQvkiWfo6";` junto às constantes do topo, com um comentário de uma linha no estilo do arquivo, por exemplo: `/** Formulário de feedback (004, FR-002): endereço fixo, sem dados do documento (FR-004). */`.
  - Dentro de `.footer-meta`, depois do `<span>` "Referência:", adicionar:
    `<a data-testid="feedback-link" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" aria-label="Enviar feedback (abre o formulário em nova aba)" title="Enviar feedback (abre o formulário em nova aba)">Enviar feedback<Icon name="external" size={12} /></a>`
  - Usar o `aria-label` como constante local para não repetir o texto. Não ler `doc` nem `layout` para montar o link. Não adicionar CSS: as regras `.app-footer a` em `src/ui/styles/app.css` já cobrem estilo, hover e temas.
  - Atualizar o comentário do componente para `/** Rodapé (FR-004, FR-027, FR-028; 004: link de feedback). */`.
- [X] T004 [US1] Rodar `npx vitest run tests/component/Footer.feedback.test.tsx` e `npx playwright test tests/e2e/feedback.spec.ts`; os dois devem passar (quickstart Q1 e Q2).

**Checkpoint**: US1 completa e testável sozinha.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T005 Rodar a regressão e confirmar que tudo passa: `npm test`, `npm run test:e2e`, com atenção a `tests/e2e/privacy.spec.ts` (nenhuma requisição na aba do editor, SC-004) e `tests/e2e/us4-export.spec.ts` (o `manual-link` continua igual), e `npx eslint src tests`.
- [ ] T006 Fazer a verificação manual do quickstart Q3 com `npm run dev`:
  - foco visível ao navegar com Tab;
  - contraste nos temas claro e escuro;
  - quebra de linha em ~375 px;
  - abertura em nova aba.
  Registrar qualquer desvio como ajuste em `src/ui/components/Footer.tsx`.

---

## Dependencies & Execution Order

- **T001, T002** (testes) → **T003** (implementação) → **T004** (testes verdes) → **T005, T006** (regressão e verificação manual).
- Só há uma história; não há dependências entre histórias.

### Parallel Opportunities

- T001 e T002 são arquivos diferentes e não dependem um do outro.
- T005 e T006 podem rodar em paralelo depois de T004.

## Parallel Example: User Story 1

```text
Task: "T001 Teste de componente do link em tests/component/Footer.feedback.test.tsx"
Task: "T002 E2E de nova aba e editor intacto em tests/e2e/feedback.spec.ts"
```

## Implementation Strategy

### MVP First

A US1 é a feature inteira: T001–T004 já entregam o MVP. T005 e T006 confirmam que nada regrediu antes do PR.

## Notes

- Fazer commit depois de T004 (testes + link) e, se houver ajustes, depois de T006.
- O PR não altera definições de layout, então não precisa citar fonte normativa.
