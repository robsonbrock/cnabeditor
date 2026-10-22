import { expect, test, type Page } from "@playwright/test";
import { row } from "./helpers";

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
