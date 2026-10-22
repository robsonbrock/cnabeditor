import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { MainPane } from "../../src/ui/components/MainPane";
import { doc, layout, resetDocumentState, selectedIndex, setDocument } from "../../src/ui/state/document";
import { L, testLayout } from "../unit/fixtures";

const eight = [L.ha(), L.hl(), L.a("00001"), L.a("00002"), L.a("00003"), L.a("00004"), L.tl("000006"), L.ta("000001", "000008")];

function load(lines: string[]) {
  act(() => setDocument(fromPastedText(lines.join("\n"), testLayout)));
}

const rows = () => screen.getAllByTestId("line-row");
const row = (n: number) => rows().find((r) => r.dataset.line === String(n))!;
const listbox = () => screen.getByRole("listbox");

describe("MainPane", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = testLayout;
  });

  it("sem conteúdo ⇒ 'Não há conteúdo para exibir'", () => {
    render(<MainPane />);
    expect(screen.getByText("Não há conteúdo para exibir")).toBeTruthy();
  });

  it("mostra '8 linhas' e cada linha com data-line e rótulo separado do texto", () => {
    render(<MainPane />);
    load(eight);
    expect(screen.getByTestId("line-count").textContent).toBe("8 linhas");
    expect(rows().map((r) => r.dataset.line)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(rows().map((r) => r.querySelector("[data-testid=line-label]")!.textContent)).toEqual(["HA", "HL", "A", "A", "A", "A", "TL", "TA"]);
    expect(row(3).querySelector(".line-text")!.textContent).toBe(eight[2]);
  });

  it("carga seleciona a linha 1; clique marca aria-selected só numa linha", () => {
    render(<MainPane />);
    load(eight);
    expect(row(1).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(row(3));
    expect(rows().filter((r) => r.getAttribute("aria-selected") === "true").map((r) => r.dataset.line)).toEqual(["3"]);
    expect(selectedIndex.value).toBe(2);
  });

  it("↓ na linha 3 seleciona a 4; ↓ na última não faz nada; ↑, Home, End, PageUp, PageDown", () => {
    render(<MainPane />);
    load(eight);
    fireEvent.click(row(3));
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(selectedIndex.value).toBe(3);
    fireEvent.keyDown(listbox(), { key: "ArrowUp" });
    expect(selectedIndex.value).toBe(2);
    fireEvent.keyDown(listbox(), { key: "End" });
    expect(selectedIndex.value).toBe(7);
    fireEvent.keyDown(listbox(), { key: "ArrowDown" });
    expect(selectedIndex.value).toBe(7);
    fireEvent.keyDown(listbox(), { key: "Home" });
    expect(selectedIndex.value).toBe(0);
    fireEvent.keyDown(listbox(), { key: "ArrowUp" });
    expect(selectedIndex.value).toBe(0);
    fireEvent.keyDown(listbox(), { key: "PageDown" });
    expect(selectedIndex.value).toBe(7);
    fireEvent.keyDown(listbox(), { key: "PageUp" });
    expect(selectedIndex.value).toBe(0);
  });

  it("digitar, Delete, Backspace e Ctrl+V não alteram o conteúdo (FR-006a)", () => {
    render(<MainPane />);
    load(eight);
    const before = doc.value!.records.map((r) => r.current);
    for (const key of ["a", "Delete", "Backspace", " "]) fireEvent.keyDown(listbox(), { key });
    fireEvent.keyDown(listbox(), { key: "v", ctrlKey: true });
    fireEvent.paste(listbox());
    expect(doc.value!.records.map((r) => r.current)).toEqual(before);
    expect(row(3).querySelector(".line-text")!.textContent).toBe(eight[2]);
    expect(listbox().getAttribute("contenteditable")).toBeNull();
    // Regressão: no WebKit, Backspace voltava à página anterior e descartava o conteúdo.
    expect(fireEvent.keyDown(listbox(), { key: "Backspace" })).toBe(false);
  });

  it("virtualização: só as linhas visíveis existem no DOM", () => {
    render(<MainPane />);
    load(Array.from({ length: 5000 }, () => L.a()));
    expect(screen.getByTestId("line-count").textContent).toBe("5000 linhas");
    expect(rows().length).toBeGreaterThan(0);
    expect(rows().length).toBeLessThan(200);
  });

  it("indicadores data-changed e data-error vêm das flags", () => {
    render(<MainPane />);
    load(eight);
    act(() => {
      doc.value!.flags[2] = 1;
      doc.value!.flags[3] = 2;
      doc.value = { ...doc.value! };
    });
    expect(row(3).dataset.changed).toBe("true");
    expect(row(3).dataset.error).toBe("false");
    expect(row(4).dataset.error).toBe("true");
    expect(row(4).dataset.changed).toBe("false");
  });
});
