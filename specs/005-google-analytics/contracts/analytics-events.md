# Contract: Eventos de Medição

Catálogo fechado aceito por `track()` (research A5). Nenhum outro nome ou parâmetro é enviado.

## Regras gerais

- Nomes em minúsculas, sem acento, separados por `_`, com até 40 caracteres (limite do GA4).
- Valores: número finito ou texto de uma união fechada que case com `^[a-z0-9_,-]{1,100}$`.
- **Proibido em qualquer evento**: nome de arquivo, conteúdo de linha ou campo, valor monetário, CPF/CNPJ, nome, agência, conta, código de barras, chave Pix, código do banco, texto de mensagem de validação (FR-007).
- Exatamente um evento por execução da ação (US2, cenário 4).
- Tipos usados abaixo:
  - `Direcao` = `remessa | retorno | desconhecida`
  - `TipoRegistro` = `header_arquivo | header_lote | inicial_lote | detalhe | final_lote | trailer_lote | trailer_arquivo | desconhecido` (`inicial_lote` e `final_lote` são os registros 2 e 4 do lote, como `saldo-inicial-*` e `saldo-final-*`)
  - `Layout` = `cnab240` (único layout suportado hoje; a união cresce com novos layouts)
  - `Servico` = sufixo do `definitionId` do header do lote da linha (`pagamento`, `cobranca`, `debito`, …, como listado em `src/layouts/febraban-cnab240-v10.11/header-lote-*.json`), `geral` para `header-lote` sem sufixo, ou `nenhum` fora de lote

## Configuração da propriedade

| Chamada | Parâmetros |
|---|---|
| `gtag('js', new Date())` | — |
| `gtag('config', 'G-TKLBD459FS', …)` | `allow_google_signals: false`, `allow_ad_personalization_signals: false`, `page_title: 'CNAB Editor'`, `page_location: <origem>/` |

## Eventos

| Evento | Quando | Parâmetros |
|---|---|---|
| `importar_arquivo` | Fim de `loadFromFile` (aplicado, enviado para confirmação ou recusado) | `resultado`: `concluida \| erro`; `motivo`: `extensao \| leitura` (só se erro); `extensao`: `rem \| ret \| txt \| outra`; `layout`: `Layout`; `direcao`: `Direcao` (se concluída); `linhas`: número (se concluída) |
| `colar_conteudo` | Confirmar ou cancelar a janela "Colar conteúdo" | `resultado`: `concluida \| cancelada`; `layout`: `Layout` (se concluída); `direcao`: `Direcao` (se concluída); `linhas`: número (se concluída) |
| `abrir_gerador` | Abrir o modal do gerador | `origem`: `cabecalho \| quadro_vazio` |
| `gerar_massa` | Resultado do gerador (`onResult`) ou fechar o modal sem gerar | `resultado`: `concluida \| erro \| cancelada`; `layout`: `Layout`; `direcao`: `remessa \| retorno`; `variantes`: ids das variantes do layout, ordenados e unidos por `,`, com até 100 caracteres; `qtd_variantes`: número; `qtd_registros`: número (soma das quantidades das variantes selecionadas); `com_conta_empresa`: `sim \| nao`; `linhas`: número (se concluída) |
| `atualizar_linha` | `updateLine` aplicado | `tipo_registro`: `TipoRegistro`; `segmento`: letra do segmento em minúscula ou `nenhum`; `servico`: `Servico`; `campos_alterados`: número; `com_erros`: `sim \| nao` |
| `descartar_edicao` | `discard` | `tipo_registro`: `TipoRegistro` |
| `edicoes_pendentes` | Escolha no diálogo de edições pendentes | `escolha`: `atualizar \| descartar \| cancelar` |
| `recalcular_totais` | `recalculate` | `campos_alterados`: número; `erros`: número |
| `proximo_erro` | `goToNextError` | `erros`: número total |
| `exportar_arquivo` | Download concluído ou diálogo de exportação cancelado | `resultado`: `concluida \| cancelada`; `extensao`: `rem \| ret \| indefinida`; `com_erros`: `sim \| nao`; `erros`: número; `linhas`: número |
| `copiar_conteudo` | Fim de `copyToClipboard` | `resultado`: `concluida \| erro`; `linhas`: número |
| `substituir_conteudo` | `confirmReplace` ou `cancelReplace` | `resultado`: `confirmada \| cancelada`; `origem`: `arquivo \| colagem \| gerador` |
| `trocar_tema` | Botão de tema | `tema`: `claro \| escuro` (o tema novo) |
| `alternar_quebra` | Botão de quebra de linha | `quebra`: `ligada \| desligada` (o estado novo) |
| `abrir_manual` | Clique no link de referência ao manual | — |
| `abrir_feedback` | Clique no link "Enviar feedback" | — |

## Fora do catálogo (de propósito)

- Digitar em campos, rolar, selecionar linha, redimensionar painéis: não são ações (spec, Assumptions).
- Eventos automáticos do GA (`page_view`, `scroll`, `click` de saída, `user_engagement`, `session_start`, `first_visit`) vêm da medição aprimorada, configurada no painel (research A12).
