import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { Header } from "../../src/ui/components/Header";
import { MainPane } from "../../src/ui/components/MainPane";
import { febrabanCnab240 } from "../../src/layouts/loader";
import { layout, resetDocumentState, setDocument } from "../../src/ui/state/document";
import { generatorOpen } from "../../src/ui/state/generator";

describe("botões \"Gerar massa de testes\" (FR-001)", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = febrabanCnab240;
    generatorOpen.value = false;
  });

  it("no cabeçalho, logo após \"Colar conteúdo\" e antes do divisor do tema", () => {
    render(<Header />);
    const button = screen.getByTestId("generate");
    expect(button.textContent).toBe("Gerar massa de testes");
    expect(button.previousElementSibling?.getAttribute("data-testid")).toBe("paste");
    expect(button.nextElementSibling?.classList.contains("divider")).toBe(true);
    expect(button.querySelector("[data-icon=wand]")).not.toBeNull();
    fireEvent.click(button);
    expect(generatorOpen.value).toBe(true);
  });

  it("na tela vazia, junto de Importar e Colar, com o texto novo (FR-001, F12)", () => {
    render(<MainPane />);
    expect(screen.getByText("Importe um arquivo CNAB 240 (.rem, .ret ou .txt), cole o conteúdo ou gere uma massa de testes.")).toBeTruthy();
    fireEvent.click(screen.getByTestId("generate-empty"));
    expect(generatorOpen.value).toBe(true);
  });

  it("generate-empty só aparece com o quadro vazio", () => {
    act(() => setDocument(fromPastedText(" ".repeat(240), febrabanCnab240)));
    render(<MainPane />);
    expect(screen.queryByTestId("generate-empty")).toBeNull();
  });
});
