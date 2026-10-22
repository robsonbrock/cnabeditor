import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";

export const GOLDEN = join(import.meta.dirname, "..", "golden", "febraban-cnab240-v10.11");
export const golden = (path: string) => join(GOLDEN, path);
export const goldenText = (path: string, encoding: BufferEncoding = "latin1") => readFileSync(golden(path)).toString(encoding);

export async function importFile(page: Page, path: string) {
  await page.getByTestId("import-input").setInputFiles(path);
}

export async function importBuffer(page: Page, name: string, buffer: Buffer) {
  await page.getByTestId("import-input").setInputFiles({ name, mimeType: "text/plain", buffer });
}

export async function pasteContent(page: Page, text: string) {
  await page.getByTestId("paste").click();
  await page.getByTestId("paste-dialog").locator("textarea").fill(text);
  await page.getByTestId("paste-confirm").click();
}

export const row = (page: Page, n: number): Locator => page.locator(`[data-testid=line-row][data-line="${n}"]`);
export const field = (page: Page, id: string): Locator => page.locator(`[data-testid=field][data-field-id="${id}"]`);
export const fieldInput = (page: Page, id: string): Locator => field(page, id).getByTestId("input");
export const lineText = (page: Page, n: number) => row(page, n).locator(".line-text").textContent();
