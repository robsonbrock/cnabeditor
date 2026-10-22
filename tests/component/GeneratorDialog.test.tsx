import { fireEvent, render, screen } from "@testing-library/preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { GeneratorDialog } from "../../src/ui/components/dialogs/GeneratorDialog";
import { febrabanCnab240 } from "../../src/layouts/loader";
import { doc, layout, resetDocumentState } from "../../src/ui/state/document";
import { generatorOpen, openGenerator } from "../../src/ui/state/generator";
import { clearToasts, toasts } from "../../src/ui/state/toasts";

const confirm = () => screen.getByTestId("generator-confirm") as HTMLButtonElement;
const check = (id: string) => fireEvent.click(screen.getByTestId(`generator-variant-${id}`));
const qty = (id: string) => screen.getByTestId(`generator-qty-${id}`) as HTMLInputElement;
const type = (testId: string, value: string) => fireEvent.input(screen.getByTestId(testId), { target: { value } });

function open() {
  render(<GeneratorDialog />);
  act(() => openGenerator());
}

describe("GeneratorDialog (US1)", () => {
  beforeEach(() => {
    resetDocumentState();
    clearToasts();
    layout.value = febrabanCnab240;
  });

  it("abre com Remessa marcado, nada selecionado, campos vazios e Gerar desabilitado (US1-1, FR-002, FR-005)", () => {
    open();
    expect((screen.getByTestId("generator-direction-remessa") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId("generator-group-header-lote-pagamento-credito").querySelector("legend")!.textContent).toBe(
      "Pagamentos (Crédito em Conta, Cheque, OP, DOC, TED, PIX ou Pagamento com Autenticação)",
    );
    expect(screen.getByTestId("generator-variants").querySelectorAll("input[type=checkbox]:checked")).toHaveLength(0);
    expect((screen.getByTestId("generator-bank") as HTMLInputElement).value).toBe("");
    expect((screen.getByTestId("generator-conta") as HTMLInputElement).value).toBe("");
    expect(confirm().disabled).toBe(true);
    expect(screen.getByTestId("generator-form-error").textContent).toBe("Marque ao menos um segmento");
  });

  it("marcar uma variação preenche a quantidade com 10 e habilita Gerar (US1-2, FR-006)", () => {
    open();
    expect(qty("segmento-a-pagamento").disabled).toBe(true);
    check("segmento-a-pagamento");
    expect(qty("segmento-a-pagamento").disabled).toBe(false);
    expect(qty("segmento-a-pagamento").value).toBe("10");
    expect(confirm().disabled).toBe(false);
    expect(screen.getByTestId("generator-estimate").textContent).toBe("14 linhas serão geradas");
  });

  it("esvaziar a quantidade mantém o padrão 10 na estimativa", () => {
    open();
    check("segmento-a-pagamento");
    type("generator-qty-segmento-a-pagamento", "");
    expect(screen.getByTestId("generator-estimate").textContent).toBe("14 linhas serão geradas");
    expect(confirm().disabled).toBe(false);
  });

  it.each(["0", "10001", "1.5", "abc", "-3"])("quantidade %s é inválida e desabilita Gerar", (value) => {
    open();
    check("segmento-a-pagamento");
    type("generator-qty-segmento-a-pagamento", value);
    expect(screen.getByTestId("generator-qty-segmento-a-pagamento-error").textContent).toBe("Informe um número inteiro de 1 a 10.000");
    expect(qty("segmento-a-pagamento").getAttribute("aria-invalid")).toBe("true");
    expect(confirm().disabled).toBe(true);
  });

  it("estimativa: aviso acima de 100.000 linhas, sem bloquear Gerar (FR-010, edge case)", () => {
    open();
    for (const id of ["segmento-a-pagamento", "segmento-j-pagamento", "segmento-o-pagamento", "segmento-p-cobranca", "segmento-a-debito", "segmento-d-custodia", "segmento-h-consignacao", "segmento-k-vendor", "segmento-a-compror", "segmento-y-02-alegacao-pagador", "segmento-n-darf-pagamento"]) {
      check(id);
      type(`generator-qty-${id}`, "10000");
    }
    expect(screen.getByTestId("generator-estimate").textContent).toBe("110.230 linhas serão geradas");
    expect(screen.getByTestId("generator-warning").textContent).toBe("110.230 linhas: a geração pode demorar");
    expect(confirm().disabled).toBe(false);
  });

  it("gerar carrega a massa no quadro principal, fecha a modal e mostra o toast (US1-3, US1-7)", () => {
    open();
    check("segmento-a-pagamento");
    check("segmento-j-pagamento");
    fireEvent.click(confirm());
    expect(generatorOpen.value).toBe(false);
    expect(doc.value!.records).toHaveLength(26);
    expect(doc.value!.origin).toBe("paste");
    expect(doc.value!.hasUnexportedChanges).toBe(true);
    expect(toasts.value.at(-1)).toMatchObject({ kind: "success", text: "Massa de testes gerada: 26 linhas" });
  });

  it("Cancelar fecha sem alterar o quadro principal (US5-4)", () => {
    open();
    check("segmento-a-pagamento");
    fireEvent.click(screen.getByTestId("generator-cancel"));
    expect(generatorOpen.value).toBe(false);
    expect(doc.value).toBeNull();
  });
});

describe("GeneratorDialog (US2): banco e conta da empresa", () => {
  beforeEach(() => {
    resetDocumentState();
    clearToasts();
    layout.value = febrabanCnab240;
  });

  it.each(["33", "AB1", "0331"])("banco %s: \"Informe exatamente 3 dígitos\" e Gerar desabilitado (US2-5)", (value) => {
    open();
    check("segmento-a-pagamento");
    type("generator-bank", value);
    expect(screen.getByTestId("generator-bank-error").textContent).toBe("Informe exatamente 3 dígitos");
    expect(screen.getByTestId("generator-bank").getAttribute("aria-invalid")).toBe("true");
    expect(confirm().disabled).toBe(true);
    type("generator-bank", "");
    expect(screen.queryByTestId("generator-bank-error")).toBeNull();
    expect(confirm().disabled).toBe(false);
  });

  it("agência e conta: só dígitos, até o tamanho do Header de Arquivo (US2-6)", () => {
    open();
    check("segmento-a-pagamento");
    type("generator-agencia", "123456");
    expect(screen.getByTestId("generator-agencia-error").textContent).toBe("Use apenas dígitos, até 5");
    type("generator-agencia", "12A");
    expect(screen.getByTestId("generator-agencia-error").textContent).toBe("Use apenas dígitos, até 5");
    type("generator-conta", "1234567890123");
    expect(screen.getByTestId("generator-conta-error").textContent).toBe("Use apenas dígitos, até 12");
    expect(confirm().disabled).toBe(true);
    type("generator-agencia", "1234");
    type("generator-conta", "56789");
    expect(confirm().disabled).toBe(false);
  });

  it("gerar aplica banco e conta informados", () => {
    open();
    check("segmento-p-cobranca");
    type("generator-bank", "033");
    type("generator-agencia", "1234");
    type("generator-conta", "56789");
    fireEvent.click(confirm());
    const records = doc.value!.records;
    expect(records.every((r) => r.current.startsWith("033"))).toBe(true);
    expect(records[0].current.slice(52, 57)).toBe("01234");
  });
});

describe("GeneratorDialog (US3): dependentes", () => {
  beforeEach(() => {
    resetDocumentState();
    clearToasts();
    layout.value = febrabanCnab240;
  });

  it("marcar Q marca P com selo e aviso; desmarcar P é recusado com o motivo (US3-1/2)", () => {
    open();
    check("segmento-q-cobranca");
    expect((screen.getByTestId("generator-variant-segmento-p-cobranca") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId("generator-auto-segmento-p-cobranca").textContent).toBe("incluído automaticamente");
    const notices = screen.getByTestId("generator-notices");
    expect(notices.getAttribute("role")).toBe("status");
    expect(notices.getAttribute("aria-live")).toBe("polite");
    expect(notices.textContent).toBe("Segmento P foi incluído porque Segmento Q depende dele");
    check("segmento-p-cobranca");
    expect((screen.getByTestId("generator-variant-segmento-p-cobranca") as HTMLInputElement).checked).toBe(true);
    expect(notices.textContent).toBe("Segmento P é necessário enquanto Segmento Q estiver marcado");
  });

  it("Q = 8 leva P a 8 e o campo de P mostra 8 (US3-5)", () => {
    open();
    check("segmento-q-cobranca");
    type("generator-qty-segmento-q-cobranca", "3");
    type("generator-qty-segmento-p-cobranca", "5");
    type("generator-qty-segmento-q-cobranca", "8");
    expect(qty("segmento-p-cobranca").value).toBe("8");
    expect(screen.getByTestId("generator-notices").textContent).toBe("Quantidade de Segmento P ajustada para 8 para acompanhar Segmento Q");
  });
});

describe("GeneratorDialog (US4): direção", () => {
  beforeEach(() => {
    resetDocumentState();
    clearToasts();
    layout.value = febrabanCnab240;
  });

  it("trocar para Retorno filtra a lista e avisa o que foi removido (US4-1)", () => {
    open();
    check("segmento-q-cobranca");
    check("segmento-a-pagamento");
    fireEvent.click(screen.getByTestId("generator-direction-retorno"));
    expect((screen.getByTestId("generator-direction-retorno") as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByTestId("generator-variant-segmento-p-cobranca")).toBeNull();
    expect(screen.getByTestId("generator-variant-segmento-t-cobranca")).toBeTruthy();
    expect(screen.getByTestId("generator-group-header-lote-conciliacao")).toBeTruthy();
    expect((screen.getByTestId("generator-variant-segmento-a-pagamento") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByTestId("generator-notices").textContent).toBe("Removidos por não existirem em Retorno: Cobrança: Segmento P, Segmento Q");
  });

  it("gerar em Retorno carrega um arquivo de retorno (US4-2)", () => {
    open();
    fireEvent.click(screen.getByTestId("generator-direction-retorno"));
    check("segmento-t-cobranca");
    fireEvent.click(confirm());
    expect(doc.value!.direction).toBe("retorno");
  });
});
