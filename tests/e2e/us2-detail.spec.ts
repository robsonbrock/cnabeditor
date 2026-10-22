import { expect, test } from "@playwright/test";
import { fieldInput, golden, importFile, row } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await importFile(page, golden("valid/pagamento-remessa.rem"));
});

test("US2-1: Código de Barras do Segmento J mostra nome, posições, tamanho e tipo", async ({ page }) => {
  await row(page, 8).click();
  await fieldInput(page, "codigoBarras").focus();
  const detail = page.getByTestId("detail-pane");
  await expect(detail.locator("h3")).toHaveText("Código de Barras");
  await expect(detail).toContainText("18 – 61");
  await expect(detail).toContainText("44");
  await expect(detail).toContainText("Numérico");
});

test("US2-2: Tipo de Registro = 3 destaca '3 – Detalhe'", async ({ page }) => {
  await row(page, 3).click();
  await fieldInput(page, "tipoRegistro").focus();
  const options = page.getByTestId("domain-options").locator("li");
  await expect(options).toHaveCount(7);
  await expect(page.getByTestId("domain-options").locator('[aria-current="true"]')).toHaveText("3 – Detalhe");
});

test("US2-3: valor fora das opções é indicado", async ({ page }) => {
  await row(page, 3).click();
  await fieldInput(page, "tipoMovimento").fill("8");
  await expect(page.getByTestId("domain-no-match")).toBeVisible();
  await expect(page.getByTestId("domain-options").locator('[aria-current="true"]')).toHaveCount(0);
});
