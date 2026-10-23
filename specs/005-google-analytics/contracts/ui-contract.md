# UI Contract: Aviso de Medição e CSP

## Aviso no rodapé (FR-010)

| Atributo | Valor |
|---|---|
| Elemento | `<span>` em `.footer-meta`, logo depois de `.local-only` |
| `data-testid` | `analytics-notice` |
| Texto visível | `Uso do site medido de forma anônima` |
| `title` | `Usamos o Google Analytics para contar visitas e ações. O conteúdo dos arquivos nunca sai do seu navegador.` |
| Acessibilidade | Mesmo texto do `title` em um elemento oculto, referenciado por `aria-describedby` |

- Presente em todos os estados (vazio, com arquivo, com erros) e em todos os modos de build. O aviso descreve o site publicado e não depende de a medição estar carregada.
- Sem banner, diálogo ou botão de recusa (FR-009).
- Estilo das regras existentes de `.footer-meta`. Em telas estreitas, quebra pelo `flex-wrap` existente, sem rolagem horizontal.
- O texto "Processado só no seu navegador" (`.local-only`) não muda.

## Links instrumentados

- `manual-link` e `feedback-link` ganham `onClick` que chama `track('abrir_manual')` e `track('abrir_feedback')`, sem `preventDefault`. `href`, `target` e `rel` não mudam (contrato da 004).

## CSP do documento (FR-004)

| Modo de build | `script-src` | `connect-src` | `img-src` |
|---|---|---|---|
| `development`, `test`, `e2e` | `'self'` | `'none'` | `'self' data: blob:` |
| `production` | `'self' https://*.googletagmanager.com` | `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` | `'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com` |

As demais diretivas (`default-src 'self'`, `style-src 'self' 'unsafe-inline'`, `worker-src 'self' blob:`) são iguais em todos os modos.

## Script do Google (FR-001, FR-002)

- Só no modo `production`: um único `<script async src="https://www.googletagmanager.com/gtag/js?id=G-TKLBD459FS">` injetado no `<head>` por `initAnalytics`.
- Em qualquer modo, `window.dataLayer` existe e recebe `js`, `config` e os eventos do [catálogo](analytics-events.md).
