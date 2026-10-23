import { render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { FEEDBACK_URL, Footer } from "../../src/ui/components/Footer";
import { febrabanCnab240 } from "../../src/layouts/loader";
import { layout, resetDocumentState, setDocument } from "../../src/ui/state/document";

const URL_FORM = "https://forms.gle/vtu9hDoSFQvkiWfo6";
const LABEL = "Enviar feedback (abre o formulário em nova aba)";

describe("link \"Enviar feedback\" no rodapé (004)", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = febrabanCnab240;
  });

  it("texto e ícone de link externo (FR-006)", () => {
    render(<Footer />);
    const link = screen.getByTestId("feedback-link");
    expect(link.tagName).toBe("A");
    expect(link.textContent).toBe("Enviar feedback");
    expect(link.querySelector("[data-icon=external]")).not.toBeNull();
  });

  it("abre o formulário em nova aba, sem acesso à aba do editor (FR-002, FR-003, FR-005)", () => {
    render(<Footer />);
    const link = screen.getByTestId("feedback-link");
    expect(FEEDBACK_URL).toBe(URL_FORM);
    expect(link.getAttribute("href")).toBe(URL_FORM);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("nome acessível informa a nova aba (FR-007)", () => {
    render(<Footer />);
    const link = screen.getByTestId("feedback-link");
    expect(link.getAttribute("aria-label")).toBe(LABEL);
    expect(link.getAttribute("title")).toBe(LABEL);
  });

  it("fica em .footer-meta, depois da referência ao manual (FR-001)", () => {
    render(<Footer />);
    const link = screen.getByTestId("feedback-link");
    expect(link.parentElement?.classList.contains("footer-meta")).toBe(true);
    expect(link.nextElementSibling).toBeNull();
    expect(link.previousElementSibling?.querySelector("[data-testid=manual-link]")).not.toBeNull();
  });

  it("não leva dados do documento no endereço (FR-004)", () => {
    act(() => setDocument(fromPastedText("03300000         2123456780001990000000000000000000000000000EMPRESA TESTE".padEnd(240), febrabanCnab240)));
    render(<Footer />);
    const href = screen.getByTestId("feedback-link").getAttribute("href")!;
    expect(href).toBe(URL_FORM);
    expect(href).not.toMatch(/[?#=]/);
  });
});
