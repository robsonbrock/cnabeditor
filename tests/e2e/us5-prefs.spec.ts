import { expect, test } from "@playwright/test";
import { golden, importFile, row } from "./helpers";

const width = async (page: import("@playwright/test").Page, testId: string) => (await page.getByTestId(testId).boundingBox())!.width;

test("US5-1: primeiro acesso ⇒ dark, quebra ativada, divisórias padrão", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByTestId("wrap-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("split-main")).toHaveAttribute("aria-valuenow", "55");
  await expect(page.getByTestId("split-right")).toHaveAttribute("aria-valuenow", "55");
});

test("US5-2/3/4: divisórias, quebra e tema restaurados ao recarregar", async ({ page }) => {
  await page.goto("/");
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  const wrappedHeight = (await row(page, 1).boundingBox())!.height;

  const main = page.getByTestId("split-main");
  const box = (await main.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x - 150, box.y + 200, { steps: 5 });
  await page.mouse.up();
  const savedMain = await main.getAttribute("aria-valuenow");
  expect(Number(savedMain)).toBeLessThan(55);

  await page.getByTestId("split-right").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("split-right")).toHaveAttribute("aria-valuenow", "59");

  await page.getByTestId("wrap-toggle").click();
  const nowrapHeight = (await row(page, 1).boundingBox())!.height;
  expect(nowrapHeight).toBeLessThan(wrappedHeight);
  expect(nowrapHeight).toBeCloseTo(20, 1);
  const lines = page.getByRole("listbox");
  expect(await lines.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);

  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const mainWidth = await width(page, "main-pane");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByTestId("wrap-toggle")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("split-main")).toHaveAttribute("aria-valuenow", savedMain!);
  await expect(page.getByTestId("split-right")).toHaveAttribute("aria-valuenow", "59");
  expect(Math.abs((await width(page, "main-pane")) - mainWidth)).toBeLessThan(3);
});

test("US5-5: arrastar até o limite respeita o mínimo do quadro", async ({ page }) => {
  await page.goto("/");
  const main = page.getByTestId("split-main");
  const box = (await main.boundingBox())!;
  await page.mouse.move(box.x + 2, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(0, box.y + 200, { steps: 5 });
  await page.mouse.up();
  expect(await width(page, "main-pane")).toBeGreaterThanOrEqual(318);
  await page.mouse.move(box.x + 2, box.y + 200);
  const box2 = (await main.boundingBox())!;
  await page.mouse.move(box2.x + 2, box2.y + 200);
  await page.mouse.down();
  await page.mouse.move(page.viewportSize()!.width, box.y + 200, { steps: 5 });
  await page.mouse.up();
  expect(await width(page, "edit-pane")).toBeGreaterThanOrEqual(358);
});

test("armazenamento indisponível ⇒ padrões, sem erro", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByTestId("theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors).toEqual([]);
});
