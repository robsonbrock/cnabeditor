import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { generateMassa } from "../../src/core/generate/build";
import { febrabanCnab240 } from "../../src/layouts/loader";
import { GeneratorDialog } from "../../src/ui/components/dialogs/GeneratorDialog";
import { ReplaceContentDialog } from "../../src/ui/components/dialogs/ReplaceContentDialog";
import { doc, layout, pendingReplace, resetDocumentState, setDocument } from "../../src/ui/state/document";
import { generatorOpen, openGenerator, selections } from "../../src/ui/state/generator";

const sample = () =>
  fromPastedText(
    generateMassa({ direction: "remessa", selections: [{ variantId: "segmento-p-cobranca", quantity: 1, auto: false }], companyAccount: {} }, febrabanCnab240, {
      seed: 5,
      today: new Date(2026, 9, 22),
    }).text,
    febrabanCnab240,
  );

function generateA() {
  render(
    <>
      <GeneratorDialog />
      <ReplaceContentDialog />
    </>,
  );
  act(() => openGenerator());
  fireEvent.click(screen.getByTestId("generator-variant-segmento-a-pagamento"));
  fireEvent.click(screen.getByTestId("generator-confirm"));
}

describe("proteção do conteúdo atual (US5, FR-029)", () => {
  beforeEach(() => {
    resetDocumentState();
    layout.value = febrabanCnab240;
  });

  it("com conteúdo sem alterações, pede confirmação com a mensagem do gerador (US5-1)", () => {
    const before = sample();
    act(() => setDocument(before));
    generateA();
    expect(pendingReplace.value).not.toBeNull();
    expect(screen.getByTestId("replace-content-dialog").textContent).toContain("O conteúdo atual do quadro principal será substituído pela massa gerada.");
    expect(doc.value).toBe(before);
    expect(generatorOpen.value).toBe(true);
  });

  it("cancelar mantém a modal com as escolhas e o quadro intacto (US5-2)", () => {
    const before = sample();
    act(() => setDocument(before));
    generateA();
    fireEvent.click(screen.getByTestId("replace-cancel"));
    expect(pendingReplace.value).toBeNull();
    expect(generatorOpen.value).toBe(true);
    expect(selections.value.map((s) => s.variantId)).toEqual(["segmento-a-pagamento"]);
    expect(doc.value).toBe(before);
  });

  it("substituir carrega a massa e fecha a modal", () => {
    act(() => setDocument(sample()));
    generateA();
    fireEvent.click(screen.getByTestId("replace-confirm"));
    expect(generatorOpen.value).toBe(false);
    expect(doc.value!.records).toHaveLength(14);
  });

  it("quadro vazio: carrega sem perguntar (US5-3)", () => {
    generateA();
    expect(pendingReplace.value).toBeNull();
    expect(doc.value!.records).toHaveLength(14);
  });

  it("importação mantém a mensagem original do diálogo", () => {
    render(<ReplaceContentDialog />);
    act(() => {
      pendingReplace.value = { next: sample(), origem: "arquivo" };
    });
    expect(screen.getByTestId("replace-content-dialog").textContent).toContain("Há alterações que ainda não foram exportadas.");
  });
});
