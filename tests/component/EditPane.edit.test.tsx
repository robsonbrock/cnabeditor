import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { EditPane } from "../../src/ui/components/EditPane";
import { doc, layout, resetDocumentState, selectLine, setDocument } from "../../src/ui/state/document";
import { L, testLayout } from "../unit/fixtures";

const fieldEl = (id: string) => screen.getAllByTestId("field").find((f) => f.dataset.fieldId === id)!;
const input = (id: string) => fieldEl(id).querySelector("input") as HTMLInputElement;
const errorText = (id: string) => fieldEl(id).querySelector("[data-testid=field-error]")?.textContent ?? null;
const counter = (id: string) => fieldEl(id).querySelector("[data-testid=field-counter]")!.textContent;

function beforeInput(el: HTMLInputElement, data: string) {
  const ev = new InputEvent("beforeinput", { data, inputType: "insertFromPaste", bubbles: true, cancelable: true });
  act(() => {
    el.dispatchEvent(ev);
  });
  return ev;
}

describe("EditPane (edição)", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = testLayout;
    act(() => setDocument(fromPastedText([L.ha(), L.hl(), L.a(), L.tl(), L.ta()].join("\n"), testLayout)));
  });

  const openA = () => act(() => selectLine(2));

  it("maxlength = tamanho e colagem acima do tamanho só aceita o que cabe (14/14)", () => {
    render(<EditPane />);
    openA();
    const el = input("numeroInscricao");
    expect(el.maxLength).toBe(14);
    el.focus();
    el.setSelectionRange(0, 14);
    const ev = beforeInput(el, "123456789012345678");
    expect(ev.defaultPrevented).toBe(true);
    expect(input("numeroInscricao").value).toBe("12345678901234");
    expect(counter("numeroInscricao")).toBe("14/14");
  });

  it("letra em campo N ⇒ erro imediato, destaque e aria-describedby", () => {
    render(<EditPane />);
    openA();
    fireEvent.input(input("numeroInscricao"), { target: { value: "0000037765454A" } });
    expect(errorText("numeroInscricao")).toBe("Caractere inválido: o campo aceita apenas dígitos (0–9)");
    expect(fieldEl("numeroInscricao").classList.contains("invalid")).toBe(true);
    const describedBy = input("numeroInscricao").getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)!.textContent).toBe(errorText("numeroInscricao"));
    fireEvent.input(input("numeroInscricao"), { target: { value: "00000377654541" } });
    expect(errorText("numeroInscricao")).toBeNull();
  });

  it("opção inválida só aparece ao sair do campo; corrigir e sair remove", () => {
    render(<EditPane />);
    openA();
    fireEvent.input(input("tipoRegistro"), { target: { value: "8" } });
    expect(errorText("tipoRegistro")).toBeNull();
    fireEvent.blur(input("tipoRegistro"));
    expect(errorText("tipoRegistro")).toBe('Opção inválida: "8" não é um valor permitido para este campo');
    fireEvent.input(input("tipoRegistro"), { target: { value: "3" } });
    expect(errorText("tipoRegistro")).not.toBeNull();
    fireEvent.blur(input("tipoRegistro"));
    expect(errorText("tipoRegistro")).toBeNull();
  });

  it("rodapé: 'Atualizar linha' com seta ← à esquerda e 'Descartar' ao lado", () => {
    render(<EditPane />);
    openA();
    const footer = screen.getByTestId("update-line").parentElement!;
    expect(footer.firstElementChild).toBe(screen.getByTestId("update-line"));
    expect(screen.getByTestId("update-line").querySelector("[data-icon=arrow-left]")).not.toBeNull();
    expect(screen.getByTestId("update-line").textContent).toContain("Atualizar linha");
    expect(screen.getByTestId("update-line").nextElementSibling).toBe(screen.getByTestId("discard"));
  });

  it("Descartar restaura o baseline", () => {
    render(<EditPane />);
    openA();
    fireEvent.input(input("nome"), { target: { value: "OUTRO" } });
    fireEvent.click(screen.getByTestId("discard"));
    expect(input("nome").value).toBe("FULANO DE TAL".padEnd(30, " "));
  });

  it("Atualizar linha reescreve só o campo editado", () => {
    render(<EditPane />);
    openA();
    fireEvent.input(input("valor"), { target: { value: "25" } });
    fireEvent.click(screen.getByTestId("update-line"));
    const rec = doc.value!.records[2];
    expect(rec.current).toBe(L.a("00001", "000000000000025"));
    expect(doc.value!.flags[2] & 1).toBe(1);
    expect(doc.value!.hasUnexportedChanges).toBe(true);
    expect(input("valor").value).toBe("000000000000025");
  });

  it("Tab percorre os campos na ordem das posições (ordem no DOM)", () => {
    render(<EditPane />);
    openA();
    const starts = screen.getAllByTestId("field-pos").map((p) => Number(p.textContent!.split("–")[0]));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect(screen.getAllByTestId("input").every((i) => !i.hasAttribute("tabindex") || i.tabIndex >= 0)).toBe(true);
  });
});
