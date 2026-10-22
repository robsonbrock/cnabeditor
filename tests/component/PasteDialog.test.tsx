import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { PasteDialog } from "../../src/ui/components/dialogs/PasteDialog";
import { doc, layout, pasteOpen, resetDocumentState, setDocument } from "../../src/ui/state/document";
import { L, testLayout } from "../unit/fixtures";

const textarea = () => screen.getByTestId("paste-dialog").querySelector("textarea")!;

describe("PasteDialog", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = testLayout;
  });

  it("texto com espaços iniciais/finais, linhas só de espaços e quebra final chega idêntico", () => {
    render(<PasteDialog />);
    act(() => {
      pasteOpen.value = true;
    });
    const text = `  ${L.ha()}  \n     \n${L.ta()}   \n`;
    fireEvent.input(textarea(), { target: { value: text } });
    fireEvent.click(screen.getByTestId("paste-confirm"));
    expect(pasteOpen.value).toBe(false);
    const sep = (t: string) => (t ? "\n" : "");
    expect(doc.value!.records.map((r) => r.current + sep(r.terminator)).join("")).toBe(text);
    expect(doc.value!.origin).toBe("paste");
  });

  it("cancelar pelo botão não altera o documento", () => {
    act(() => setDocument(fromPastedText(L.ha(), testLayout)));
    const before = doc.value;
    render(<PasteDialog />);
    act(() => {
      pasteOpen.value = true;
    });
    fireEvent.input(textarea(), { target: { value: "outro" } });
    fireEvent.click(screen.getByTestId("paste-cancel"));
    expect(pasteOpen.value).toBe(false);
    expect(doc.value).toBe(before);
  });

  it("Esc (evento cancel) equivale a cancelar", () => {
    render(<PasteDialog />);
    act(() => {
      pasteOpen.value = true;
    });
    fireEvent.input(textarea(), { target: { value: "x" } });
    act(() => {
      screen.getByTestId("paste-dialog").dispatchEvent(new Event("cancel", { cancelable: true }));
    });
    expect(pasteOpen.value).toBe(false);
    expect(doc.value).toBeNull();
  });
});
