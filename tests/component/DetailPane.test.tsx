import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { DetailPane } from "../../src/ui/components/DetailPane";
import { EditPane } from "../../src/ui/components/EditPane";
import { layout, resetDocumentState, selectLine, setDocument } from "../../src/ui/state/document";
import { L, testLayout } from "../unit/fixtures";

const input = (id: string) =>
  screen.getAllByTestId("field").find((f) => f.dataset.fieldId === id)!.querySelector("input") as HTMLInputElement;
const detail = () => screen.getByTestId("detail-pane");
const dd = (label: string) => {
  const dt = [...detail().querySelectorAll("dt")].find((d) => d.textContent === label);
  return dt?.nextElementSibling?.textContent;
};

describe("DetailPane", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = testLayout;
    act(() => setDocument(fromPastedText([L.ha(), L.hl(), L.a(), L.tl(), L.ta()].join("\n"), testLayout)));
    act(() => selectLine(2));
  });

  it("sem campo em foco ⇒ estado vazio", () => {
    render(<DetailPane />);
    expect(detail().textContent).toContain("Coloque o cursor em um campo");
  });

  it("mostra nome, de/até, tamanho, tipo por extenso, obrigatoriedade, descrição e referência", () => {
    render(
      <>
        <EditPane />
        <DetailPane />
      </>,
    );
    fireEvent.focus(input("numeroInscricao"));
    expect(detail().querySelector("h3")!.textContent).toBe("Número de Inscrição");
    expect(dd("De / até")).toBe("45 – 58");
    expect(dd("Tamanho")).toBe("14");
    expect(dd("Tipo")).toBe("Numérico");
    expect(dd("Obrigatório")).toBe("Não");
    expect(dd("Casas decimais")).toBeUndefined();
    expect(detail().textContent).toContain("Descrição de Número de Inscrição");
  });

  it("tipo V mostra casas decimais; tipos por extenso", () => {
    render(
      <>
        <EditPane />
        <DetailPane />
      </>,
    );
    fireEvent.focus(input("valor"));
    expect(dd("Tipo")).toBe("Valor");
    expect(dd("Casas decimais")).toBe("2");
    fireEvent.focus(input("nome"));
    expect(dd("Tipo")).toBe("Alfanumérico");
  });

  it("campo codificado lista as opções com aria-current na atual", () => {
    render(
      <>
        <EditPane />
        <DetailPane />
      </>,
    );
    fireEvent.focus(input("tipoRegistro"));
    const options = screen.getByTestId("domain-options").querySelectorAll("li");
    expect(options).toHaveLength(5);
    const current = [...options].filter((o) => o.getAttribute("aria-current") === "true");
    expect(current.map((o) => o.textContent)).toEqual(["3 – Detalhe"]);
    expect(screen.queryByTestId("domain-no-match")).toBeNull();
  });

  it("valor sem correspondência ⇒ domain-no-match; acompanha o valor digitado", () => {
    render(
      <>
        <EditPane />
        <DetailPane />
      </>,
    );
    fireEvent.focus(input("tipoRegistro"));
    fireEvent.input(input("tipoRegistro"), { target: { value: "7" } });
    expect(screen.getByTestId("domain-no-match").textContent).toContain("7");
    expect(screen.getByTestId("domain-options").querySelectorAll('[aria-current="true"]')).toHaveLength(0);
  });
});
