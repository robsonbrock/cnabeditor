import { expect, test, type Page } from "@playwright/test";
import { GTAG_SRC } from "../../src/ui/analytics-id";
import { fieldInput, golden, importFile, row } from "./helpers";

// Build production (porta 4174, projeto analytics-prod): todo tráfego ao Google é abortado (005, research A8).
const GOOGLE = /https:\/\/([^/]+\.)?(googletagmanager|google-analytics|analytics\.google)\.com\//;
const PROD_CSP =
  "default-src 'self'; connect-src https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com; " +
  "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; " +
  "worker-src 'self' blob:; script-src 'self' https://*.googletagmanager.com";

let requested: string[];
let consoleErrors: string[];

test.beforeEach(async ({ context, page }) => {
  requested = [];
  consoleErrors = [];
  await context.route(GOOGLE, (r) => {
    requested.push(r.request().url());
    return r.abort();
  });
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  await page.goto("/");
});

const toast = (page: Page, kind: string) => page.locator(`[data-testid=toast][data-kind=${kind}]`);

test("pede o gtag.js com o ID da propriedade (FR-001)", async ({ page }) => {
  await expect.poll(() => requested).toContain(GTAG_SRC);
  await expect(page.getByTestId("app-footer")).toBeVisible();
});

test("CSP de produção libera só os domínios do GA4 (FR-004)", async ({ page }) => {
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toBe(PROD_CSP);
});

test("editor funciona com o Google bloqueado (FR-003, SC-003)", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await row(page, 3).click();
  await fieldInput(page, "valorPagamento").fill("999");
  await page.getByTestId("update-line").click();
  await page.getByTestId("recalc").click();
  await page.getByTestId("recalc-close").click();
  const download = page.waitForEvent("download");
  await page.getByTestId("export").click();
  expect(await (await download).path()).toBeTruthy();
  await expect(toast(page, "error")).toHaveCount(0);
  expect(consoleErrors.filter((t) => !/google|ERR_FAILED|net::/i.test(t))).toEqual([]);
});
