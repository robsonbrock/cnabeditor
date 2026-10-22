# Cobertura da transcrição: FEBRABAN CNAB 240 v10.11

Fonte: [Layout Padrão CNAB 240 – V10.11 – 21/08/2023](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf). As páginas são as impressas no manual. Os rodapés do PDF dizem "V10.9", mas o documento publicado é a v10.11.

Cada definição é um JSON nesta pasta, com `id` igual ao nome do arquivo. As verificações automáticas são `npm run validate:layout` (JSON Schema) e `tests/unit/layout-integrity.test.ts` (cobertura de 1 a 240, domínios, totais e ausência de ambiguidade).

A coluna "Golden" indica um golden file em `tests/golden/febraban-cnab240-v10.11/` que exercita a definição. Toda definição tem ao menos um; `tests/golden/parse.test.ts` falha se alguma ficar sem.

## Convenções da transcrição

- **Tipo do campo:**
  - Num com decimais vira `V`.
  - Num de data com 8 dígitos (DDMMAAAA) vira `D`.
  - Num de hora com 6 dígitos (HHMMSS) vira `H`.
  - Os demais Num viram `N`, e Alfa vira `A`.
  - Quando o manual se contradiz, valem as posições.
- **`required`:** só os campos de controle e identificação são obrigatórios. São eles: banco, lote, tipo de registro, sequencial, segmento, operação, serviço, forma de lançamento, versão do lote, tipo/código de movimento, identificação de registro opcional e quantidade de registros do lote. O `*` do manual significa "atenção especial", não obrigatoriedade.
- **`sensitive`:** CPF/CNPJ/inscrição, agência, conta e DVs. Esses valores são mascarados em logs (Princípio V).
- **Domínios:** um domínio só foi transcrito quando cada código tem o tamanho do campo. Os campos de ocorrências (G059, C047, K001, K020…) guardam até 5 códigos de 2 caracteres em 10 posições e ficam sem domínio. A lista desses códigos está na descrição.
- **Fallbacks:** `header-lote` e `trailer-lote` (1 condição) cobrem lotes de serviços sem definição específica. Eles mostram os campos comuns (manual 2.1) e o restante como "Dados específicos do serviço".

## Arquivo e lote genérico

| Definição | Manual | Golden |
|---|---|---|
| header-arquivo | 2.2 p.17 | valid/cobranca-retorno.ret |
| trailer-arquivo | 2.2 p.18 | valid/cobranca-retorno.ret |
| header-lote (fallback) | 2.1 p.14 | valid/cobertura-lote-generico.rem |
| trailer-lote (fallback) | 2.1 p.14 | valid/cobertura-lote-generico.rem |

## 3.1 Pagamentos

| Definição | Manual | Golden |
|---|---|---|
| header-lote-pagamento-credito | 3.1.2 p.24 | valid/latin1-acentos.rem |
| segmento-a-pagamento | 3.1.2 p.25 | valid/latin1-acentos.rem |
| segmento-b-pagamento | 3.1.2 p.26 | valid/pagamento-remessa.rem |
| segmento-c-pagamento | 3.1.2 p.27 | valid/cobertura-pagamento-credito.rem |
| trailer-lote-pagamento | 3.1.2 p.28 / 3.1.3 p.34 | valid/latin1-acentos.rem |
| header-lote-pagamento-titulos | 3.1.3 p.29 | valid/pagamento-remessa.rem |
| segmento-j-pagamento | 3.1.3 p.30 | valid/pagamento-remessa.rem |
| segmento-j-52-pagamento | 3.1.3 p.31 | valid/pagamento-remessa.rem |
| segmento-j-52-pix-pagamento | 3.1.3 p.32 | valid/cobertura-pagamento-credito.rem |
| segmento-j-53-pagamento | 3.1.3 p.33 | valid/cobertura-pagamento-credito.rem |
| header-lote-pagamento-tributos | 3.1.4 p.35 | valid/cobertura-pagamento-tributos.rem |
| segmento-o-pagamento | 3.1.4 p.36 | valid/cobertura-pagamento-credito.rem |
| segmento-n-pagamento | 3.1.4 p.37 | valid/cobertura-pagamento-credito.rem |
| segmento-n-gps-pagamento | N1 p.38 | valid/cobertura-pagamento-credito.rem |
| segmento-n-darf-pagamento | N2 p.39 | valid/cobertura-pagamento-credito.rem |
| segmento-n-darf-simples-pagamento | N3 p.40 | valid/cobertura-pagamento-credito.rem |
| segmento-n-gare-sp-pagamento | N4 p.41 | valid/cobertura-pagamento-credito.rem |
| segmento-n-ipva-pagamento | N5 p.42 | valid/cobertura-pagamento-credito.rem |
| segmento-n-dpvat-pagamento | N6 p.43 | valid/cobertura-pagamento-credito.rem |
| segmento-n-licenciamento-pagamento | N7 p.44 | valid/cobertura-pagamento-credito.rem |
| segmento-w-pagamento | 3.1.4 p.46 | valid/cobertura-pagamento-credito.rem |
| segmento-w-fgts-pagamento | W1 p.47 | valid/cobertura-pagamento-credito.rem |
| segmento-z-pagamento | 3.1.4 p.48 | valid/cobertura-pagamento-credito.rem |
| trailer-lote-pagamento-tributos | 3.1.4 p.49 | valid/cobertura-pagamento-credito.rem |

Decisões e pendências:

- **J-52 × J-52 Pix:** nada na linha nem no contexto do lote os distingue. A Forma de Lançamento 47 não faz parte do contexto. Por isso o J-52 padrão exige, na pos. 132, um código G005 (0/1/2/3/9), e qualquer outro J-52 é tratado como Pix. É uma heurística: uma chave Pix que comece por 0/1/2/3/9 é lida como J-52 padrão.
- **Trailer de tributos:** é distinguido pela versão do lote, 010/011/012. O manual só cita 012; 010 e 011 são suposição.
- **N8 DARJ (p.45):** não foi modelado, porque as pos. 133–134 são Inscrição Estadual e não há como distinguir a linha. Linhas DARJ usam `segmento-n-pagamento`.
- **Erros do manual corrigidos pelas posições:**
  - J-53, campo 15: 56 posições.
  - N3, Período de Apuração: 8 dígitos, tipado `D`.
  - Referência B002 no trailer de tributos: interpretada como soma do Valor do Pagamento de O/N.
- **Totais não modelados:** Número Aviso de Débito (G066), preenchido pelo banco.

## 3.2 Cobrança, Boleto de Pagamento Eletrônico e Alegação do Pagador

| Definição | Manual | Golden |
|---|---|---|
| header-lote-cobranca | 3.2.2 p.56 | valid/cobranca-retorno.ret |
| segmento-p-cobranca | 3.2.2 p.57 | valid/cobertura-cobranca.rem |
| segmento-q-cobranca | 3.2.2 p.59 | valid/cobertura-cobranca.rem |
| segmento-r-cobranca | 3.2.2 p.60 | valid/cobertura-cobranca.rem |
| segmento-s-cobranca | 3.2.2 p.61 | valid/cobertura-cobranca.rem |
| segmento-s-3-cobranca | 3.2.2 p.61 | valid/cobertura-cobranca.rem |
| segmento-y-01-cobranca | 3.2.2 p.62 | valid/cobertura-cobranca.rem |
| segmento-y-04-cobranca | 3.2.2 p.63 | valid/cobertura-cobranca.rem |
| segmento-y-05-cobranca | 3.2.2 p.64 | valid/cobertura-cobranca.rem |
| segmento-y-50-cobranca | 3.2.2 p.65–66 | valid/cobertura-cobranca.rem |
| segmento-y-51-cobranca | 3.2.2 p.66 | valid/cobertura-cobranca.rem |
| segmento-y-52-cobranca | 3.2.2 p.68 | valid/cobertura-cobranca.rem |
| segmento-y-53-cobranca | 3.2.2 p.69 | valid/cobertura-cobranca.rem |
| segmento-t-cobranca | 3.2.2 p.70 | valid/cobranca-retorno.ret |
| segmento-u-cobranca | 3.2.2 p.71 | valid/cobranca-retorno.ret |
| trailer-lote-cobranca | 3.2.2 p.72 | valid/cobranca-retorno.ret |
| header-lote-boleto-eletronico | 3.2.3 p.73 | valid/cobertura-boleto-eletronico.rem |
| segmento-g-boleto-eletronico | 3.2.3 p.74 | valid/cobertura-boleto-eletronico.rem |
| segmento-h-boleto-eletronico | 3.2.3 p.75 | valid/cobertura-boleto-eletronico.rem |
| segmento-y-03-boleto-eletronico | 3.2.3 p.76 | valid/cobertura-boleto-eletronico.rem |
| segmento-y-51-boleto-eletronico | 3.2.3 p.77 | valid/cobertura-boleto-eletronico.rem |
| segmento-y-52-boleto-eletronico | 3.2.3 p.78 | valid/cobertura-boleto-eletronico.rem |
| segmento-y-53-boleto-eletronico | 3.2.3 p.79 | valid/cobertura-boleto-eletronico.rem |
| trailer-lote-boleto-eletronico | 3.2.3 p.80 | valid/cobertura-boleto-eletronico.rem |
| header-lote-alegacao-pagador | 3.2.4 p.81 | valid/cobertura-alegacao-pagador.rem |
| segmento-y-02-alegacao-pagador | 3.2.4 p.82 | valid/cobertura-alegacao-pagador.rem |
| trailer-lote-alegacao-pagador | 3.2.4 p.83 | valid/cobertura-alegacao-pagador.rem |

Decisões e pendências:

- **Y-04 / Y-05:** seguem os defaults da tabela ('03' e '04'), embora o G067 associe '03' a "Dados do Pagador" e '04' a "Cheques". Confirmar com arquivos reais.
- **Correções de posição no Y-51 do Boleto:**
  - NF1 valor: 35–49.
  - NF3 data: 126–133.
- **Y-52 "Data Emissão NF 2":** tem 9 posições (132–140), tipada `N`.
- **Segmentos Y nos dois sentidos:** o movimento usa o domínio C004 (remessa). Um retorno com códigos C044 vai gerar avisos de domínio.
- **Totais não modelados:** quantidades e valores por carteira no trailer de Cobrança (06.5–13.5), porque dependem do código de carteira.

## 3.3 a 3.9 Demais serviços

| Definição | Manual | Golden |
|---|---|---|
| header-lote-conciliacao | 3.3.2 p.87 | valid/cobertura-conciliacao.rem |
| segmento-e-conciliacao | 3.3.2 p.88 | valid/cobertura-conciliacao.rem |
| trailer-lote-conciliacao | 3.3.2 p.89 | valid/cobertura-conciliacao.rem |
| header-lote-debito | 3.4.2 p.94 | valid/cobertura-debito.rem |
| segmento-a-debito | 3.4.2 p.95 | valid/cobertura-debito.rem |
| segmento-b-debito | 3.4.2 p.96 | valid/cobertura-debito.rem |
| segmento-c-debito | 3.4.2 p.97 | valid/cobertura-debito.rem |
| trailer-lote-debito | 3.4.2 p.98 | valid/cobertura-debito.rem |
| header-lote-vendor | 3.5.2 p.106 | valid/cobertura-vendor.rem |
| segmento-k-vendor | 3.5.2 p.107 | valid/cobertura-vendor.rem |
| segmento-l-vendor | 3.5.2 p.108 | valid/cobertura-vendor.rem |
| segmento-m-vendor | 3.5.2 p.109 | valid/cobertura-vendor.rem |
| segmento-n-vendor | 3.5.2 p.110 | valid/cobertura-vendor.rem |
| trailer-lote-vendor | 3.5.2 p.111 | valid/cobertura-vendor.rem |
| header-lote-custodia | 3.6.2 p.116 | valid/cobertura-custodia.rem |
| segmento-d-custodia | 3.6.2 p.117 | valid/cobertura-custodia.rem |
| trailer-lote-custodia | 3.6.2 p.118 | valid/cobertura-custodia.rem |
| header-lote-gestao-caixa | 3.7.2 p.123 | valid/cobertura-gestao-caixa.rem |
| saldo-inicial-gestao-caixa | 3.7.2 p.124 | valid/cobertura-gestao-caixa.rem |
| segmento-f-gestao-caixa | 3.7.2 p.125 | valid/cobertura-gestao-caixa.rem |
| segmento-i-gestao-caixa | 3.7.2 p.126 | valid/cobertura-gestao-caixa.rem |
| saldo-final-gestao-caixa | 3.7.2 p.127 | valid/cobertura-gestao-caixa.rem |
| trailer-lote-gestao-caixa | 3.7.2 p.128 | valid/cobertura-gestao-caixa.rem |
| header-lote-consignacao | 3.8.2 p.133 | valid/cobertura-consignacao.rem |
| segmento-h-consignacao | 3.8.2 p.134–135 | valid/cobertura-consignacao.rem |
| trailer-lote-consignacao | 3.8.2 p.136 | valid/cobertura-consignacao.rem |
| header-lote-compror | 3.9.2 p.142 | valid/cobertura-compror.rem |
| segmento-a-compror | 3.1.2 p.25 (ref. 3.9.2 p.143) | valid/cobertura-compror.rem |
| segmento-b-compror | 3.1.2 p.26 | valid/cobertura-compror.rem |
| segmento-c-compror | 3.1.2 p.27 | valid/cobertura-compror.rem |
| segmento-j-compror | 3.1.3 p.30 | valid/cobertura-compror.rem |
| segmento-i-compror | 3.9.2 p.144 | valid/cobertura-compror.rem |
| segmento-i-11-compror | 3.9.2 p.145 | valid/cobertura-compror.rem |
| trailer-lote-compror | 3.9.2 p.146 | valid/cobertura-compror.rem |

Decisões e pendências:

- **Débito em Conta:** identificado pelo serviço '05' e pela operação 'D'. A Forma de Lançamento 50 não é exigida.
- **Header de Consignação:** tem layout próprio.
  - O lote fica nas pos. 21–24.
  - A versão do lote fica nas 12–14 e carrega o `batchContext: "layoutVersion"`.
  - A pos. 9 é a Modalidade de Averbação (`batchContext: "operation"`).
  - Serviços: 08, 09, 11, 12, 13.
- **Gestão de Caixa:** posições impressas sobrepostas foram corrigidas:
  - CNAB 190–240.
  - Horário do Saldo Final: 106–111.
- **Compror:** A/B/C/J foram copiados das tabelas de Pagamentos, como o manual indica.
- **Registros tipo 2/4 (saldos):** recebem o rótulo `?`, porque FR-009a só define HA/HL/segmento/TL/TA.
- **Totais não modelados:**
  - Conciliação: somas por natureza (E023/E024).
  - Gestão de Caixa: F013.
  - Consignação: H032–H041.
  - Custódia: K022 (contagem só de detalhes).
  - Número Aviso de Débito (G066).
