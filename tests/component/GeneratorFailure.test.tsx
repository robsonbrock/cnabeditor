import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fromPastedText } from "../../src/core/document";
import { generateMassa } from "../../src/core/generate/build";
import { febrabanCnab240 } from "../../src/layouts/loader";
import { GeneratorDialog } from "../../src/ui/components/dialogs/GeneratorDialog";
import { doc, layout, resetDocumentState, setDocument } from "../../src/ui/state/document";
import { generatorOpen, openGenerator, selections } from "../../src/ui/state/generator";
import { toasts } from "../../src/ui/state/toasts";

/** Worker falso que sempre responde erro: o estado do gerador cria o Worker na primeira geração deste arquivo. */
class FailingWorker {
  private listener: ((e: MessageEvent) => void) | null = null;
  addEventListener(_type: string, fn: (e: MessageEvent) => void) {
    this.listener = fn;
  }
  postMessage(msg: { jobId: number }) {
    setTimeout(() => this.listener?.({ data: { type: "error", jobId: msg.jobId, message: "falha simulada" } } as MessageEvent), 0);
  }
}

describe("falha na geração (FR-030)", () => {
  const original = globalThis.Worker;
  beforeAll(() => {
    (globalThis as { Worker?: unknown }).Worker = FailingWorker;
  });
  afterAll(() => {
    (globalThis as { Worker?: unknown }).Worker = original;
  });

  it("mantém a modal aberta com as escolhas, não altera o quadro e mostra o toast de erro", async () => {
    resetDocumentState();
    layout.value = febrabanCnab240;
    const before = fromPastedText(
      generateMassa({ direction: "remessa", selections: [{ variantId: "segmento-a-pagamento", quantity: 1, auto: false }], companyAccount: {} }, febrabanCnab240, {
        seed: 1,
        today: new Date(2026, 9, 22),
      }).text,
      febrabanCnab240,
    );
    act(() => setDocument(before));
    render(<GeneratorDialog />);
    act(() => openGenerator());
    fireEvent.click(screen.getByTestId("generator-variant-segmento-j-pagamento"));
    fireEvent.click(screen.getByTestId("generator-confirm"));
    await waitFor(() => expect(toasts.value.at(-1)).toMatchObject({ kind: "error", text: "Massa de testes não gerada: falha simulada" }));
    expect(generatorOpen.value).toBe(true);
    expect(selections.value.map((s) => s.variantId)).toEqual(["segmento-j-pagamento"]);
    expect(doc.value).toBe(before);
    expect((screen.getByTestId("generator-confirm") as HTMLButtonElement).disabled).toBe(false);
  });
});
