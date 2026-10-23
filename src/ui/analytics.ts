import type { CnabRecord, Direction } from "../core/types";
import { GTAG_SRC, MEASUREMENT_ID } from "./analytics-id";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/** O gtag.js só é carregado no build publicado; nos outros modos o dataLayer fica em memória (research A2). */
export const ANALYTICS_ENABLED = import.meta.env.MODE === "production";

type Target = Pick<Window, "dataLayer">;
/** `globalThis` e não `window`: os testes de unidade em Node importam os módulos de estado. */
let target: Target = globalThis as Target;
let started = false;

/** Mesma função da tag fornecida: o gtag.js exige o objeto `arguments`, não um array. */
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  (target.dataLayer ??= []).push(arguments);
}

/**
 * Reproduz a tag do Google sem script embutido, que a CSP bloquearia (research A1). Só injeta o
 * gtag.js com `load` (research A2), com sinais de publicidade desligados e título e endereço fixos
 * (A4). É chamada depois do `render` e ignora falhas do script (A7).
 */
export function initAnalytics({ load = ANALYTICS_ENABLED, doc = document, win = window as Window } = {}): void {
  if (started) return;
  started = true;
  target = win;
  win.dataLayer ??= [];
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_title: "CNAB Editor",
    page_location: win.location.origin + "/",
  });
  if (!load) return;
  const script = doc.createElement("script");
  script.async = true;
  script.src = GTAG_SRC;
  script.onerror = () => {};
  doc.head.appendChild(script);
}

// ---------- Catálogo de eventos (contracts/analytics-events.md, research A5) ----------

export type Direcao = "remessa" | "retorno" | "desconhecida";
export type TipoRegistro =
  | "header_arquivo"
  | "header_lote"
  | "inicial_lote"
  | "detalhe"
  | "final_lote"
  | "trailer_lote"
  | "trailer_arquivo"
  | "desconhecido";
export type Layout = "cnab240";
/** Sufixos de header-lote-*.json do layout; `geral` = header-lote; `nenhum` = fora de lote. */
const SERVICOS = [
  "alegacao-pagador",
  "boleto-eletronico",
  "cobranca",
  "compror",
  "conciliacao",
  "consignacao",
  "custodia",
  "debito",
  "gestao-caixa",
  "pagamento-credito",
  "pagamento-titulos",
  "pagamento-tributos",
  "vendor",
] as const;
export type Servico = (typeof SERVICOS)[number] | "geral" | "nenhum";
type SimNao = "sim" | "nao";
type None = Record<string, never>;

export interface AnalyticsEvents {
  importar_arquivo: {
    resultado: "concluida" | "erro";
    motivo?: "extensao" | "leitura";
    extensao: "rem" | "ret" | "txt" | "outra";
    layout: Layout;
    direcao?: Direcao;
    linhas?: number;
  };
  colar_conteudo: { resultado: "concluida" | "cancelada"; layout?: Layout; direcao?: Direcao; linhas?: number };
  abrir_gerador: { origem: "cabecalho" | "quadro_vazio" };
  gerar_massa: {
    resultado: "concluida" | "erro" | "cancelada";
    layout: Layout;
    direcao: "remessa" | "retorno";
    variantes: string;
    qtd_variantes: number;
    qtd_registros: number;
    com_conta_empresa: SimNao;
    linhas?: number;
  };
  atualizar_linha: { tipo_registro: TipoRegistro; segmento: string; servico: Servico; campos_alterados: number; com_erros: SimNao };
  descartar_edicao: { tipo_registro: TipoRegistro };
  edicoes_pendentes: { escolha: "atualizar" | "descartar" | "cancelar" };
  recalcular_totais: { campos_alterados: number; erros: number };
  proximo_erro: { erros: number };
  exportar_arquivo: { resultado: "concluida" | "cancelada"; extensao: "rem" | "ret" | "indefinida"; com_erros: SimNao; erros: number; linhas: number };
  copiar_conteudo: { resultado: "concluida" | "erro"; linhas: number };
  substituir_conteudo: { resultado: "confirmada" | "cancelada"; origem: "arquivo" | "colagem" | "gerador" };
  trocar_tema: { tema: "claro" | "escuro" };
  alternar_quebra: { quebra: "ligada" | "desligada" };
  abrir_manual: None;
  abrir_feedback: None;
}

const SAFE_TEXT = /^[a-z0-9_,-]{1,100}$/;

/** Defesa em profundidade contra um `as never`: só números finitos e textos de enum passam. */
export function sanitize(params: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if ((typeof v === "number" && Number.isFinite(v)) || (typeof v === "string" && SAFE_TEXT.test(v))) out[k] = v;
  }
  return out;
}

/** Registra uma ação do catálogo; nunca lança nem atrasa o editor (research A7). */
export function track<K extends keyof AnalyticsEvents>(
  name: K,
  ...[params]: AnalyticsEvents[K] extends None ? [] : [AnalyticsEvents[K]]
): void {
  try {
    gtag("event", name, sanitize((params ?? {}) as Record<string, unknown>));
  } catch {
    // medição nunca interfere no editor (FR-003)
  }
}

export const direcao = (d: Direction): Direcao => (d === "unknown" ? "desconhecida" : d);

/** Registros 2 e 4 do lote (saldos) não são header nem trailer: inicial e final de lote. */
const TIPO_POR_PREFIXO: [string, TipoRegistro][] = [
  ["header-arquivo", "header_arquivo"],
  ["header-lote", "header_lote"],
  ["saldo-inicial-", "inicial_lote"],
  ["saldo-final-", "final_lote"],
  ["trailer-lote", "trailer_lote"],
  ["trailer-arquivo", "trailer_arquivo"],
];

/** Tipo de registro e letra do segmento pelo id da definição resolvida. */
export function tipoRegistro(rec: CnabRecord): { tipo_registro: TipoRegistro; segmento: string } {
  const id = rec.definitionId ?? "";
  const seg = /^segmento-([a-z])(?:-|$)/.exec(id);
  if (seg) return { tipo_registro: "detalhe", segmento: seg[1] };
  const tipo = TIPO_POR_PREFIXO.find(([prefix]) => id.startsWith(prefix))?.[1] ?? "desconhecido";
  return { tipo_registro: tipo, segmento: "nenhum" };
}

/** Serviço do lote da linha, pelo sufixo do header de lote resolvido. */
export function servico(rec: CnabRecord, records: CnabRecord[]): Servico {
  const line = rec.batchContext?.headerLine;
  const id = line ? records[line - 1]?.definitionId : null;
  if (id === "header-lote") return "geral";
  const suffix = id?.startsWith("header-lote-") ? id.slice("header-lote-".length) : "";
  return (SERVICOS as readonly string[]).includes(suffix) ? (suffix as Servico) : "nenhum";
}
