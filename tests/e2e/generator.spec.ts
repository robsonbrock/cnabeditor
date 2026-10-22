import { expect, test, type Page } from "@playwright/test";
import { golden, importFile, lineText, row } from "./helpers";

const generator = (page: Page) => page.getByTestId("generator-dialog");
const check = (page: Page, id: string) => page.getByTestId(`generator-variant-${id}`).check();

async function generate(page: Page, ids: string[]) {
  await page.getByTestId("generate").click();
  for (const id of ids) await check(page, id);
  await page.getByTestId("generator-confirm").click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("US1-3/4/5/7: Segmento A + Segmento J geram 26 linhas válidas no quadro principal", async ({ page }) => {
  await generate(page, ["segmento-a-pagamento", "segmento-j-pagamento"]);
  await expect(page.getByTestId("toast").filter({ hasText: "Massa de testes gerada: 26 linhas" })).toBeVisible();
  await expect(generator(page)).not.toBeVisible();
  await expect(page.getByTestId("line-count")).toHaveText("26 linhas");
  await expect(page.getByTestId("direction")).toHaveText("Remessa");
  await expect(page.getByTestId("error-count")).toHaveText("0 erros");
  await expect(row(page, 1)).toHaveAttribute("aria-selected", "true");
  const labels = await page.getByTestId("line-label").allTextContents();
  expect(labels.slice(0, 3)).toEqual(["HA", "HL", "A"]);
});

test("FR-030: falha na geração mantém a modal e o quadro e mostra toast de erro", async ({ page }) => {
  await page.addInitScript(() => {
    const Real = window.Worker;
    window.Worker = class extends Real {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (!String(url).includes("generation")) return;
        this.postMessage = (msg: { jobId: number }) => {
          setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { type: "error", jobId: msg.jobId, message: "falha simulada" } })), 0);
        };
      }
    };
  });
  await page.goto("/");
  await generate(page, ["segmento-a-pagamento"]);
  await expect(page.getByTestId("toast").filter({ hasText: "Massa de testes não gerada: falha simulada" })).toBeVisible();
  await expect(generator(page)).toBeVisible();
  await expect(page.getByTestId("generator-variant-segmento-a-pagamento")).toBeChecked();
  await expect(page.getByTestId("line-count")).toHaveText("0 linhas");
});

test("US2-1/2/2a/3: banco 033 em todas as linhas; agência e conta da empresa nos headers e em cada P", async ({ page }) => {
  await page.getByTestId("generate").click();
  await check(page, "segmento-a-pagamento");
  await check(page, "segmento-p-cobranca");
  await page.getByTestId("generator-bank").fill("033");
  await page.getByTestId("generator-agencia").fill("1234");
  await page.getByTestId("generator-conta").fill("56789");
  await page.getByTestId("generator-confirm").click();
  await expect(page.getByTestId("error-count")).toHaveText("0 erros");
  const texts = await page.locator("[data-testid=line-row] .line-text").allTextContents();
  expect(texts.length).toBeGreaterThan(5);
  for (const t of texts) expect(t.slice(0, 3)).toBe("033");
  await row(page, 1).click();
  await expect(page.locator("[data-testid=field][data-field-id=agencia] [data-testid=input]")).toHaveValue("01234");
  await expect(page.locator("[data-testid=field][data-field-id=numeroConta] [data-testid=input]")).toHaveValue("000000056789");
  const firstP = texts.findIndex((t) => t[7] === "3" && t[13] === "P");
  await row(page, firstP + 1).click();
  await expect(page.locator("[data-testid=field][data-field-id=agencia] [data-testid=input]")).toHaveValue("01234");
  await expect(page.locator("[data-testid=field][data-field-id=conta] [data-testid=input]")).toHaveValue("000000056789");
  const firstA = texts.findIndex((t) => t[7] === "3" && t[13] === "A");
  await row(page, firstA + 1).click();
  await expect(page.locator("[data-testid=field][data-field-id=contaFavorecido] [data-testid=input]")).not.toHaveValue("000000056789");
});

test("US3-1/2/5: marcar só Q inclui P com aviso, P não desmarca e a quantidade acompanha", async ({ page }) => {
  await page.getByTestId("generate").click();
  await check(page, "segmento-q-cobranca");
  await expect(page.getByTestId("generator-variant-segmento-p-cobranca")).toBeChecked();
  await expect(page.getByTestId("generator-auto-segmento-p-cobranca")).toBeVisible();
  await expect(page.getByTestId("generator-notices")).toHaveText("Segmento P foi incluído porque Segmento Q depende dele");
  await page.getByTestId("generator-variant-segmento-p-cobranca").click();
  await expect(page.getByTestId("generator-variant-segmento-p-cobranca")).toBeChecked();
  await expect(page.getByTestId("generator-notices")).toHaveText("Segmento P é necessário enquanto Segmento Q estiver marcado");
  await page.getByTestId("generator-qty-segmento-q-cobranca").fill("12");
  await expect(page.getByTestId("generator-qty-segmento-p-cobranca")).toHaveValue("12");
  await page.getByTestId("generator-confirm").click();
  await expect(page.getByTestId("line-count")).toHaveText("28 linhas");
  await expect(page.getByTestId("error-count")).toHaveText("0 erros");
  const labels = await page.getByTestId("line-label").allTextContents();
  expect(labels.slice(2, 6)).toEqual(["P", "Q", "P", "Q"]);
});

test("US4-2: Retorno + Segmento T + Segmento U gera retorno sem erros", async ({ page }) => {
  await page.getByTestId("generate").click();
  await page.getByTestId("generator-direction-retorno").check();
  await check(page, "segmento-u-cobranca");
  await expect(page.getByTestId("generator-variant-segmento-t-cobranca")).toBeChecked();
  await page.getByTestId("generator-confirm").click();
  await expect(page.getByTestId("direction")).toHaveText("Retorno");
  await expect(page.getByTestId("error-count")).toHaveText("0 erros");
  await expect(page.getByTestId("line-count")).toHaveText("24 linhas");
});

test("US5-1/2: com arquivo importado, gerar pede confirmação; cancelar volta à modal; substituir carrega", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await expect(page.getByTestId("line-count")).toHaveText("11 linhas");
  const before = await lineText(page, 1);
  await generate(page, ["segmento-a-pagamento"]);
  await expect(page.getByTestId("replace-content-dialog")).toContainText("O conteúdo atual do quadro principal será substituído pela massa gerada.");
  await page.getByTestId("replace-cancel").click();
  await expect(generator(page)).toBeVisible();
  await expect(page.getByTestId("generator-variant-segmento-a-pagamento")).toBeChecked();
  expect(await lineText(page, 1)).toBe(before);
  await page.getByTestId("generator-confirm").click();
  await page.getByTestId("replace-confirm").click();
  await expect(generator(page)).not.toBeVisible();
  await expect(page.getByTestId("line-count")).toHaveText("14 linhas");
});
