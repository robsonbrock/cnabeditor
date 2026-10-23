# Implementation Plan: Link de Feedback

**Branch**: `004-link-feedback` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-link-feedback/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

O rodapé ganha um link "Enviar feedback" que abre o formulário `https://forms.gle/vtu9hDoSFQvkiWfo6` em uma nova aba, ao lado do link "Referência" do manual.

**Abordagem técnica**:
- Uma âncora estática em `.footer-meta` no [Footer.tsx](../../src/ui/components/Footer.tsx), com `target="_blank"` e `rel="noopener noreferrer"`, como o `manual-link` já existente.
- O endereço fica numa constante exportada do próprio componente, sem parâmetros e sem nenhum dado do documento.
- O estilo vem das regras `.app-footer a` existentes; nenhuma regra CSS nova.

Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.9 (target ES2022); Node.js 22 só para build e testes.

**Primary Dependencies**: as da feature 001 (Preact 10 + @preact/signals, Vite 6; dev: Vitest 3, happy-dom, @testing-library/preact, Playwright). **Nenhuma dependência nova.**

**Storage**: N/A. O link não lê nem grava nada.

**Testing**: Vitest + @testing-library/preact (componente: texto, `href`, `target`, `rel`, ícone, nome acessível, ausência de dados do documento no `href`) e Playwright (E2E: abertura em nova aba sem alterar o editor; nenhuma requisição na aba do editor).

**Target Platform**: navegadores desktop modernos, os mesmos da 001; publicação estática.

**Project Type**: aplicação web estática de página única (client-only), a mesma da 001.

**Performance Goals**: nenhum custo mensurável. É um elemento estático, sem estado, sem efeito e sem requisição na aba do editor.

**Constraints**:
- Nenhum dado do documento no endereço (FR-004).
- `noopener noreferrer` obrigatório (FR-005).
- A CSP `connect-src 'none'` continua intacta. Navegar para outra aba não é uma conexão da página, então a CSP não precisa mudar.

**Scale/Scope**: 1 link, 1 componente alterado, 0 regras CSS novas.

Nenhum NEEDS CLARIFICATION pendente; as decisões estão em [research.md](research.md) F1–F5.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Pré-pesquisa | Pós-design | Evidência |
|---|---|---|---|
| **I. Layout como Dado** | ✅ Não toca layout | ✅ O endereço do formulário é do site, não do layout, e por isso não vai para `layout.source` | research F2 |
| **II. Round-Trip sem Perdas** | ✅ Não toca o conteúdo | ✅ O link não lê nem altera o documento; o E2E confirma que o quadro fica idêntico depois do clique | [quickstart.md](quickstart.md) Q2 |
| **III. Validação Explícita e Não Destrutiva** | ✅ N/A | ✅ N/A | — |
| **IV. Test-First** | ✅ | ✅ Testes de componente e E2E escritos antes do link; nenhum golden file novo, porque nenhum layout muda | quickstart Q1–Q3 |
| **V. Privacidade e Processamento Local** | ⚠️ O link leva o usuário a um serviço externo (Google Forms) | ✅ É navegação iniciada pelo usuário, sem dados do arquivo: `href` constante, sem parâmetros, `noreferrer` (sem `Referer`), `noopener`. O teste confirma que o `href` não muda com um documento carregado, e a suíte de privacidade continua sem requisições na aba do editor | research F3, F4; [contracts/ui-contract.md](contracts/ui-contract.md) |
| **Restrições** (YAGNI) | ✅ | ✅ Zero dependências, zero CSS novo, sem configuração externa | research F2 |

**Resultado**: PASS. O alerta do Princípio V foi resolvido no design: só o usuário decide o que envia, digitando no próprio formulário. Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/004-link-feedback/
├── plan.md              # Este arquivo
├── research.md          # Fase 0: decisões F1–F5
├── data-model.md        # Fase 1: sem entidades; só a constante do endereço
├── quickstart.md        # Fase 1: cenários de validação Q1–Q3
├── contracts/
│   └── ui-contract.md   # Fase 1: contrato do link no rodapé
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; não criado aqui)
```

### Source Code (repository root)

```text
src/ui/components/
└── Footer.tsx                  # + FEEDBACK_URL e o link "Enviar feedback" em .footer-meta

tests/component/
└── Footer.feedback.test.tsx    # novo: contrato do link (FR-001, FR-002, FR-004–FR-007)

tests/e2e/
├── us4-export.spec.ts          # (sem mudança; o teste do manual-link continua igual)
└── feedback.spec.ts            # novo: nova aba, editor intacto, endereço exato (FR-003)
```

**Structure Decision**: aplicação única já existente (feature 001). A mudança fica no componente de rodapé e não há camada nova em `src/core` nem em `src/ui/state`, porque o link não tem estado.

## Complexity Tracking

Sem violações.
