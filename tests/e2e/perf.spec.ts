import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { buildPerfFile } from "../../scripts/generate-perf-files";
import { fieldInput, importFile, row } from "./helpers";

const FIXTURES = join(import.meta.dirname, "fixtures");

function fixture(n: number): string {
  const path = join(FIXTURES, `perf-${n}.rem`);
  if (!existsSync(path)) {
    mkdirSync(FIXTURES, { recursive: true });
    writeFileSync(path, buildPerfFile(n), "latin1");
  }
  return path;
}

/** Registra tarefas longas (> 200 ms) na thread principal (Chromium). */
async function watchLongTasks(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __long: number[] };
    w.__long = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__long.push(e.duration);
    }).observe({ type: "longtask", buffered: false });
  });
  return () => page.evaluate(() => (window as unknown as { __long: number[] }).__long);
}

test.describe("@perf desempenho", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "PerformanceObserver longtask só no Chromium");
  test.setTimeout(180_000);

  test("SC-005: 10.000 linhas carregadas e exibidas em até 3 s", async ({ page }) => {
    const path = fixture(10_000);
    await page.goto("/");
    const start = Date.now();
    await importFile(page, path);
    await expect(page.getByTestId("line-count")).toHaveText("10000 linhas");
    await expect(row(page, 1)).toBeVisible();
    expect(Date.now() - start).toBeLessThanOrEqual(3000);
    await expect(page.getByTestId("error-count")).toHaveText("0 erros", { timeout: 30_000 });
  });

  test("SC-005/SC-005a/SC-004: 100.000 linhas sem tarefas longas ao rolar, selecionar e editar", async ({ page }) => {
    const path = fixture(100_000);
    await page.goto("/");
    await importFile(page, path);
    await expect(page.getByTestId("line-count")).toHaveText("100000 linhas", { timeout: 30_000 });
    await expect(page.getByTestId("error-count")).toHaveText("0 erros", { timeout: 60_000 });

    const longTasks = await watchLongTasks(page);
    const lines = page.getByRole("listbox");
    for (let i = 0; i < 20; i++) await lines.evaluate((el, y) => el.scrollBy(0, y), 4000);
    await lines.evaluate((el) => (el.scrollTop = el.scrollHeight / 2));
    await page.waitForTimeout(100);

    const target = page.locator("[data-testid=line-row]").nth(5);
    const t0 = Date.now();
    await target.click();
    await expect(page.getByTestId("record-title")).toHaveText("Detalhe – Segmento A");
    expect(Date.now() - t0).toBeLessThanOrEqual(1000);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    const t1 = Date.now();
    await fieldInput(page, "agenciaFavorecido").fill("0432X");
    await expect(page.locator("[data-field-id=agenciaFavorecido] [data-testid=field-error]")).toBeVisible();
    expect(Date.now() - t1).toBeLessThanOrEqual(1000);
    await fieldInput(page, "agenciaFavorecido").fill("04322");
    await page.getByTestId("update-line").click();
    await expect(page.getByTestId("toast").filter({ hasText: "atualizada" })).toBeVisible();

    await page.waitForTimeout(200);
    const over = (await longTasks()).filter((d) => d > 200);
    expect(over, `tarefas longas: ${over.join(", ")} ms`).toEqual([]);
  });
});
