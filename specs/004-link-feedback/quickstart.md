# Quickstart: Link de Feedback

## Pré-requisitos

```sh
npm install
```

## Q1. Contrato do link (componente)

```sh
npx vitest run tests/component/Footer.feedback.test.tsx
```

O resultado esperado é que todos os testes passem, verificando:
- texto "Enviar feedback" com ícone `external`;
- `href` exato, `target="_blank"` e `rel="noopener noreferrer"`;
- `aria-label` e `title` iguais e posição depois do link "Referência";
- `href` idêntico com o editor vazio e com um documento carregado (FR-004).

Contrato completo em [contracts/ui-contract.md](contracts/ui-contract.md).

## Q2. Nova aba sem afetar o editor (E2E)

```sh
npx playwright test tests/e2e/feedback.spec.ts tests/e2e/privacy.spec.ts
```

O resultado esperado:
- Com um golden file importado, uma linha selecionada e um campo editado, o clique em `feedback-link` abre uma nova página (`context.waitForEvent("page")`) com o endereço do formulário. O teste intercepta a rota com `page.route` para não depender da internet.
- Na aba original, `line-count`, a linha selecionada e o valor editado continuam iguais.
- `privacy.spec.ts` continua sem requisições na aba do editor.

## Q3. Verificação manual (visual e acessibilidade)

```sh
npm run dev
```

1. Abrir o editor, ir até o rodapé e conferir "Enviar feedback" ao lado de "Referência", com o ícone de link externo.
2. Navegar com Tab até o link e conferir o foco visível. O leitor de tela deve anunciar "Enviar feedback (abre o formulário em nova aba)".
3. Alternar o tema e conferir o contraste nos temas claro e escuro.
4. Reduzir a janela para cerca de 375 px e conferir que o link quebra de linha, sem rolagem horizontal.
5. Clicar no link e conferir que o formulário abre em nova aba e que o editor fica como estava.

## Suíte completa

```sh
npm test && npm run test:e2e
```
