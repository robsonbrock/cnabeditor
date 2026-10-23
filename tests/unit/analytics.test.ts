// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GTAG_SRC, MEASUREMENT_ID } from "../../src/ui/analytics-id";

type Mod = typeof import("../../src/ui/analytics");

/** Cada teste parte de um módulo novo: initAnalytics é idempotente por módulo. */
async function fresh(): Promise<Mod> {
  vi.resetModules();
  return import("../../src/ui/analytics");
}

const entries = () => (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>));
const scripts = () => [...document.head.querySelectorAll("script")].filter((s) => s.src.includes("googletagmanager"));

beforeEach(() => {
  delete window.dataLayer;
  for (const s of scripts()) s.remove();
});

afterEach(() => vi.restoreAllMocks());

describe("initAnalytics (005, US1)", () => {
  it("sem load: js e config na fila, nenhum script", async () => {
    const { initAnalytics } = await fresh();
    initAnalytics({ load: false });
    const [js, config] = entries();
    expect(js[0]).toBe("js");
    expect(js[1]).toBeInstanceOf(Date);
    expect(config).toEqual([
      "config",
      MEASUREMENT_ID,
      {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_title: "CNAB Editor",
        page_location: `${location.origin}/`,
      },
    ]);
    expect(entries()).toHaveLength(2);
    expect(scripts()).toHaveLength(0);
  });

  it("com load: um único script async com o src da tag", async () => {
    const { initAnalytics } = await fresh();
    initAnalytics({ load: true });
    const all = [...document.head.querySelectorAll("script")].filter((s) => s.getAttribute("src") === GTAG_SRC);
    expect(all).toHaveLength(1);
    expect(all[0].async).toBe(true);
  });

  it("é idempotente", async () => {
    const { initAnalytics } = await fresh();
    initAnalytics({ load: true });
    initAnalytics({ load: true });
    expect(scripts()).toHaveLength(1);
    expect(entries().filter((e) => e[0] === "config")).toHaveLength(1);
  });

  it("page_location ignora query e fragmento", async () => {
    const { initAnalytics } = await fresh();
    const win = { location: new URL("https://x.test/?nome=a#b") } as unknown as Window;
    initAnalytics({ load: false, win });
    const config = (win.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>)).find((e) => e[0] === "config")!;
    expect((config[2] as { page_location: string }).page_location).toBe("https://x.test/");
  });

  it("falha ao carregar o script não lança nem escreve no console", async () => {
    const { initAnalytics } = await fresh();
    initAnalytics({ load: true });
    // O happy-dom registra no console que não baixa scripts; só o onerror do módulo interessa aqui.
    await new Promise((r) => setTimeout(r, 0));
    const error = vi.spyOn(console, "error");
    const script = scripts()[0];
    expect(() => script.onerror?.(new Event("error"))).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  });

  it("não carrega no Vitest", async () => {
    const { ANALYTICS_ENABLED } = await fresh();
    expect(ANALYTICS_ENABLED).toBe(false);
  });
});

const events = () => entries().filter((e) => e[0] === "event");

describe("track e sanitize (005, US2)", () => {
  it("empilha o evento como a tag faz", async () => {
    const { track } = await fresh();
    track("trocar_tema", { tema: "claro" });
    expect(events()).toEqual([["event", "trocar_tema", { tema: "claro" }]]);
  });

  it("sanitize mantém só números finitos e textos do catálogo", async () => {
    const { sanitize } = await fresh();
    expect(
      sanitize({
        linhas: 14,
        erros: 0,
        direcao: "remessa",
        variantes: "segmento-a-pagamento,segmento-b-pagamento",
        nan: NaN,
        inf: Infinity,
        empresa: "EMPRESA FICTICIA",
        arquivo: "remessa.rem",
        caminho: "a/b",
        maiuscula: "Remessa",
        acento: "cobrança",
        longo: "a".repeat(101),
        objeto: {},
        indefinido: undefined,
      }),
    ).toEqual({ linhas: 14, erros: 0, direcao: "remessa", variantes: "segmento-a-pagamento,segmento-b-pagamento" });
  });

  it("parâmetro fora do catálogo não chega ao dataLayer", async () => {
    const { track } = await fresh();
    track("copiar_conteudo", { resultado: "concluida", linhas: 3, arquivo: "x.rem" } as never);
    expect(events()).toEqual([["event", "copiar_conteudo", { resultado: "concluida", linhas: 3 }]]);
  });

  it("não lança se o dataLayer falhar", async () => {
    const { track } = await fresh();
    window.dataLayer = [];
    window.dataLayer.push = () => {
      throw new Error("bloqueado");
    };
    expect(() => track("abrir_manual")).not.toThrow();
  });

  it("antes de initAnalytics cria o dataLayer sob demanda", async () => {
    const { track } = await fresh();
    expect(() => track("abrir_feedback")).not.toThrow();
    expect(events()).toEqual([["event", "abrir_feedback", {}]]);
  });
});
