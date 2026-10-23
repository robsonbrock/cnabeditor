# Data Model: Medição de Uso com Google Analytics

Nenhum dado é persistido pelo editor. As entidades abaixo existem só em memória, no `window.dataLayer`, até o gtag.js enviá-las (em produção) ou a página fechar.

## AnalyticsConfig

Constante do módulo `src/ui/analytics.ts`.

| Campo | Valor | Origem |
|---|---|---|
| `measurementId` | `G-6QQBTELE2T` | spec FR-001 |
| `load` | `import.meta.env.MODE === "production"` | research A2 |
| `scriptSrc` | `https://www.googletagmanager.com/gtag/js?id=G-6QQBTELE2T` | tag fornecida |
| `configParams` | `allow_google_signals: false`, `allow_ad_personalization_signals: false`, `page_title: "CNAB Editor"`, `page_location: origem + "/"` | research A4 |

## AnalyticsEvent

| Campo | Tipo | Regra |
|---|---|---|
| `name` | uma das chaves de `AnalyticsEvents` | catálogo de [contracts/analytics-events.md](contracts/analytics-events.md) |
| `params` | objeto com os parâmetros do evento | cada valor é `number` finito ou literal de união fechada; texto deve casar com `^[a-z0-9_,-]{1,100}$` |

**Validação**:
- Em compilação: o tipo mapeado `AnalyticsEvents` (nome → parâmetros) impede nomes e parâmetros fora do catálogo.
- Em execução: `sanitize(params)` descarta valores fora da regra antes de chamar `gtag('event', name, params)` (research A5).

**Ciclo de vida**: a ação é executada, `track(name, params)` faz `dataLayer.push(['event', name, params])` e, em produção, o gtag.js lê a fila e envia em lote. Sem o gtag.js (modos não produtivos, bloqueio ou falta de rede), o item fica no array em memória e é descartado ao fechar a aba.

## Visita

Gerada pelo próprio gtag.js no `config` (`page_view` automático): origem do acesso, dispositivo, navegador e localização aproximada, conforme a coleta padrão do GA4. O editor não acrescenta nada a ela além dos parâmetros de `configParams`.

## Relações

- `AnalyticsConfig` 1 → N `AnalyticsEvent`: todos os eventos vão para a mesma propriedade.
- Nenhuma relação com `CnabDocument`. Os eventos derivam só contagens e enums do documento (direção, quantidade de linhas, tipo de registro), nunca referências a ele.
