import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { febrabanCnab240 } from "../../src/layouts/loader";
import { EditPane } from "../../src/ui/components/EditPane";
import { layout, resetDocumentState, selectLine, setDocument } from "../../src/ui/state/document";
import { line } from "../unit/fixtures";

const ha = line({ 1: "341", 4: "0000", 8: "0", 18: "2", 19: "00000377654540", 73: "EMPRESA FICTICIA LTDA", 143: "1", 144: "22102026" });
const lines = [ha, line({ 8: "7" }), line({ 1: "341", 4: "9999", 8: "9" })];

const field = (id: string) => screen.getAllByTestId("field").find((f) => f.dataset.fieldId === id)!;
const part = (el: Element, testId: string) => el.querySelector(`[data-testid=${testId}]`) as HTMLElement;

describe("EditPane (visualização)", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = febrabanCnab240;
    act(() => setDocument(fromPastedText(lines.join("\r\n"), febrabanCnab240)));
  });

  it("cabeçalho com título do registro e 'Linha i de N'", () => {
    render(<EditPane />);
    expect(screen.getByTestId("record-title").textContent).toBe("Header de Arquivo");
    expect(screen.getByTestId("line-position").textContent).toBe("Linha 1 de 3");
  });

  it("um campo por campo da definição, na ordem das posições, com posição, nome, valor e contador", () => {
    render(<EditPane />);
    const ids = screen.getAllByTestId("field").map((f) => f.dataset.fieldId);
    expect(ids).toEqual(febrabanCnab240.records.find((r) => r.id === "header-arquivo")!.fields.map((f) => f.id));
    const f = field("numeroInscricaoEmpresa");
    expect(part(f, "field-pos").textContent).toBe("19–32");
    expect(part(f, "field-name").textContent).toBe("Número de Inscrição da Empresa");
    expect((part(f, "input") as HTMLInputElement).value).toBe("00000377654540");
    expect(part(f, "field-counter").textContent).toBe("9/14");
    expect((part(field("nomeEmpresa"), "input") as HTMLInputElement).value).toBe("EMPRESA FICTICIA LTDA" + " ".repeat(9));
  });

  it("contador atualiza ao digitar", () => {
    render(<EditPane />);
    const input = part(field("numeroInscricaoEmpresa"), "input") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "12345678901234" } });
    expect(part(field("numeroInscricaoEmpresa"), "field-counter").textContent).toBe("14/14");
  });

  it("registro não reconhecido ⇒ 'Não reconhecido' e um campo bruto", () => {
    render(<EditPane />);
    act(() => selectLine(1));
    expect(screen.getByTestId("record-title").textContent).toBe("Não reconhecido");
    expect(screen.getByTestId("line-position").textContent).toBe("Linha 2 de 3");
    expect(screen.getAllByTestId("field")).toHaveLength(1);
    expect(part(field("conteudoBruto"), "field-pos").textContent).toBe("1–240");
  });

  it("sem linha selecionada ⇒ estado vazio", () => {
    resetDocumentState();
    render(<EditPane />);
    expect(screen.queryAllByTestId("field")).toHaveLength(0);
  });
});
