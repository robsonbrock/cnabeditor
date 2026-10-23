# Research: Link de Feedback

Não havia NEEDS CLARIFICATION no Technical Context. Estas são as decisões de design que sustentam o plano.

## F1. Âncora comum, não botão com `window.open`

- **Decision**: um `<a href target="_blank" rel="noopener noreferrer">`, igual ao `manual-link` do rodapé.
- **Rationale**: com uma âncora comum, o navegador oferece "abrir em nova aba", "copiar endereço" e clique do meio. Isso cobre o caso de bloqueio de nova aba (spec, Edge Cases). Não precisa de JavaScript e recebe foco de teclado sem trabalho extra.
- **Alternatives considered**: `<button>` com `window.open`. Rejeitado: perde o menu de contexto, pode ser bloqueado como pop-up e exige código para algo que o HTML já faz.

## F2. Endereço como constante no componente

- **Decision**: `export const FEEDBACK_URL = "https://forms.gle/vtu9hDoSFQvkiWfo6"` no [Footer.tsx](../../src/ui/components/Footer.tsx). O teste importa a constante e também compara com o literal.
- **Rationale**: é um dado do site, não do layout CNAB. Por isso não vai para `layout.source`, que identifica a fonte normativa (Princípio I). Trocar de formulário é editar uma linha (spec, Assumptions).
- **Alternatives considered**:
  - Variável de ambiente do Vite (`import.meta.env`): rejeitada. Só existe um endereço, e a variável criaria um modo de falha (build sem a variável) sem nenhum ganho. YAGNI.
  - Arquivo de configuração JSON: rejeitado pelo mesmo motivo.

## F3. Nenhum dado do documento no endereço

- **Decision**: `href` constante, sem query string e sem `entry.*` de pré-preenchimento do Google Forms. O componente não lê `doc` para montar o link.
- **Rationale**: FR-004 e Princípio V. Pré-preencher, por exemplo, o tipo de arquivo ou a versão do layout facilitaria a análise do feedback, mas tiraria do usuário a decisão sobre o que sai do navegador.
- **Alternatives considered**: pré-preencher a versão do app. Rejeitado por ora: não foi pedido, e qualquer dado automático exigiria consentimento explícito.

## F4. `noopener noreferrer` e a CSP

- **Decision**: `rel="noopener noreferrer"`; a CSP não muda.
- **Rationale**:
  - `noopener` impede que a aba do formulário acesse `window.opener` (FR-005).
  - `noreferrer` evita enviar o endereço do editor no cabeçalho `Referer`.
  - A CSP `connect-src 'none'` controla requisições feitas pela página (fetch, XHR, WebSocket). Abrir um link em nova aba é navegação de nível superior, fora do alcance de `connect-src` e de `default-src`. O teste de privacidade existente (SC-008) continua válido: a aba do editor não faz nenhuma requisição.
- **Alternatives considered**: só `noopener`. Rejeitado, porque `noreferrer` vazaria menos e custa nada.

## F5. Texto, ícone e nome acessível

- **Decision**:
  - Texto visível: "Enviar feedback", seguido do ícone `external` (12 px), como o `manual-link`.
  - `aria-label`: "Enviar feedback (abre o formulário em nova aba)".
  - `title`: o mesmo texto do `aria-label`.
  - `data-testid`: `feedback-link`.
  - Posição: em `.footer-meta`, depois do `<span>` "Referência".
- **Rationale**: FR-006 e FR-007. As regras `.app-footer a` já cobrem cor de destaque, sublinhado no hover e os dois temas. `.footer-meta` já tem `flex-wrap`, então o link quebra de linha em tela estreita sem rolagem horizontal. O foco visível usa o `:focus-visible` global existente; a verificação está em quickstart Q3.
- **Alternatives considered**: ícone de mensagem. Rejeitado: o ícone de link externo é o que sinaliza a saída do site, e é o padrão já usado no rodapé.
