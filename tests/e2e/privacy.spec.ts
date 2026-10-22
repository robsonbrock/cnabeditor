import { expect, test } from "@playwright/test";
import { fieldInput, golden, importFile, row } from "./helpers";

test("SC-008: nenhuma requisição de rede após o carregamento; CSP connect-src 'none'", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("connect-src 'none'");

  const requests: string[] = [];
  page.on("request", (r) => {
    // O Worker de validação é um arquivo estático do próprio bundle (carregado uma vez, sem conteúdo do arquivo).
    if (!/\/assets\/validation\.worker-[\w-]+\.js$/.test(new URL(r.url()).pathname)) requests.push(`${r.method()} ${r.url()}`);
  });

  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await row(page, 3).click();
  await fieldInput(page, "valorPagamento").fill("999");
  await page.getByTestId("update-line").click();
  await page.getByTestId("recalc").click();
  await page.getByTestId("recalc-close").click();
  const download = page.waitForEvent("download");
  await page.getByTestId("export").click();
  await download;
  await page.getByTestId("copy").click();
  await page.waitForTimeout(500);

  expect(requests).toEqual([]);
});

test("conteúdo de arquivo nunca é gravado no navegador (FR-034)", async ({ page }) => {
  await page.goto("/");
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await page.getByTestId("theme-toggle").click();
  const stored = await page.evaluate(() => ({
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    cookie: document.cookie,
    values: Object.values(localStorage).join(""),
  }));
  expect(stored.local).toEqual(["cnabeditor.prefs.v1"]);
  expect(stored.session).toEqual([]);
  expect(stored.cookie).toBe("");
  expect(stored.values).not.toContain("EMPRESA FICTICIA");
});
