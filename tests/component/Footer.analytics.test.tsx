import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { FEEDBACK_URL, Footer } from "../../src/ui/components/Footer";
import { febrabanCnab240 } from "../../src/layouts/loader";
import { layout, resetDocumentState, setDocument } from "../../src/ui/state/document";

const events = () =>
  (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>)).filter((e) => e[0] === "event").map((e) => [e[1], e[2]]);

describe("eventos dos links do rodapé (005, US2)", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = febrabanCnab240;
    window.dataLayer = [];
  });

  it("manual e feedback geram um evento cada, sem parâmetros", () => {
    render(<Footer />);
    fireEvent.click(screen.getByTestId("manual-link"));
    fireEvent.click(screen.getByTestId("feedback-link"));
    expect(events()).toEqual([
      ["abrir_manual", {}],
      ["abrir_feedback", {}],
    ]);
  });

  it("links continuam com o contrato da 004", () => {
    render(<Footer />);
    const manual = screen.getByTestId("manual-link");
    const feedback = screen.getByTestId("feedback-link");
    expect(manual.getAttribute("href")).toBe(febrabanCnab240.source.url);
    expect(feedback.getAttribute("href")).toBe(FEEDBACK_URL);
    for (const link of [manual, feedback]) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });
});

const NOTICE = "Uso do site medido de forma anônima";
const DETAIL = "Usamos o Google Analytics para contar visitas e ações. O conteúdo dos arquivos nunca sai do seu navegador.";

describe("aviso de medição no rodapé (005, US3)", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = febrabanCnab240;
  });

  it("fica em .footer-meta, logo depois de .local-only (FR-010)", () => {
    render(<Footer />);
    const notice = screen.getByTestId("analytics-notice");
    expect(notice.parentElement?.classList.contains("footer-meta")).toBe(true);
    expect(notice.previousElementSibling?.classList.contains("local-only")).toBe(true);
    expect(notice.firstChild?.textContent).toBe(NOTICE);
  });

  it("detalhe no title e no aria-describedby", () => {
    render(<Footer />);
    const notice = screen.getByTestId("analytics-notice");
    expect(notice.getAttribute("title")).toBe(DETAIL);
    const id = notice.getAttribute("aria-describedby")!;
    expect(document.getElementById(id)?.textContent).toBe(DETAIL);
  });

  it("aparece com o quadro vazio e com documento carregado", () => {
    const { unmount } = render(<Footer />);
    expect(screen.getByTestId("analytics-notice")).toBeTruthy();
    unmount();
    act(() => setDocument(fromPastedText("03300000         2123456780001990000000000000000000000000000EMPRESA TESTE".padEnd(240), febrabanCnab240)));
    render(<Footer />);
    expect(screen.getByTestId("analytics-notice")).toBeTruthy();
  });

  it("'Processado só no seu navegador' não muda", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector(".local-only")?.textContent).toBe("Processado só no seu navegador");
  });
});

describe("sem banner de consentimento (005, FR-009)", () => {
  it("o App não abre diálogo nem oferece Aceitar/Recusar", async () => {
    resetDocumentState();
    const { App } = await import("../../src/ui/App");
    const { container } = render(<App />);
    expect(container.querySelectorAll("dialog[open], [role=dialog]:not(dialog)")).toHaveLength(0);
    const labels = [...container.querySelectorAll("button")].map((b) => b.textContent ?? "");
    expect(labels.filter((t) => /Recusar|Aceitar/i.test(t))).toEqual([]);
  }, 30_000); // importar o App inteiro (layout completo) leva alguns segundos no happy-dom
});
