import { expect, test } from "@playwright/test";
import { fieldInput, golden, importFile, row } from "./helpers";

const URL_FORM = "https://forms.gle/vtu9hDoSFQvkiWfo6";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("FR-003: o formulário abre em nova aba e o editor fica como estava", async ({ page, context }) => {
  // O formulário é respondido localmente: o teste não depende da internet.
  await context.route("https://forms.gle/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>form</title>" }));
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await row(page, 3).click();
  await fieldInput(page, "valorPagamento").fill("999");
  const lineCount = await page.getByTestId("line-count").textContent();

  const popup = context.waitForEvent("page");
  await page.getByTestId("feedback-link").click();
  const form = await popup;
  await form.waitForLoadState();
  expect(form.url()).toBe(URL_FORM);

  await expect(page.getByTestId("line-count")).toHaveText(lineCount!);
  await expect(row(page, 3)).toHaveAttribute("aria-selected", "true");
  await expect(fieldInput(page, "valorPagamento")).toHaveValue("999");
});

test("tela estreita: o link fica dentro do rodapé e não alarga a página", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const link = page.getByTestId("feedback-link");
  await expect(link).toBeVisible();
  // O cabeçalho já alarga a página além de 375 px antes desta feature; aqui só se garante que o link não piora isso.
  const { linkRight, footerRight, header, page: width } = await page.evaluate(() => ({
    linkRight: document.querySelector("[data-testid=feedback-link]")!.getBoundingClientRect().right,
    footerRight: document.querySelector("[data-testid=app-footer]")!.getBoundingClientRect().right,
    header: document.querySelector("[data-testid=app-header]")!.scrollWidth,
    page: document.documentElement.scrollWidth,
  }));
  expect(linkRight).toBeLessThanOrEqual(footerRight);
  expect(width).toBeLessThanOrEqual(Math.max(375, header));
});
