import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { fieldInput, golden, importFile, pasteContent, row } from "./helpers";

const toast = (page: Page, text: string) => page.getByTestId("toast").filter({ hasText: text });

async function exportAndSave(page: Page, confirm: () => Promise<void> = async () => {}) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export").click();
  await confirm();
  const download = await downloadPromise;
  const path = await download.path();
  return { name: download.suggestedFilename(), bytes: readFileSync(path!) };
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 9, 22, 11, 52, 7) });
  await page.goto("/");
});

test("US4-1/2: exporta cnabeditor_AAAAMMDDHHMMSS.rem idêntico byte a byte e mostra toast", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await page.clock.setFixedTime(new Date(2026, 9, 22, 11, 52, 7));
  const { name, bytes } = await exportAndSave(page);
  expect(name).toBe("cnabeditor_20261022115207.rem");
  expect(bytes.equals(readFileSync(golden("valid/pagamento-remessa.rem")))).toBe(true);
  await expect(toast(page, 'Arquivo "cnabeditor_20261022115207.rem" exportado')).toHaveAttribute("data-kind", "success");
});

test("FR-025: retorno com LF e quebras mistas sem quebra final são preservados", async ({ page }) => {
  for (const file of ["valid/cobranca-retorno.ret", "valid/quebras-mistas.txt", "valid/utf8-bom.rem", "valid/latin1-acentos.rem"]) {
    await importFile(page, golden(file));
    const { bytes, name } = await exportAndSave(page, async () => {
      // arquivos com acentos têm erros de charset: confirmar a exportação
      if (await page.getByTestId("export-errors-dialog").isVisible()) await page.getByTestId("export-confirm").click();
    });
    expect(bytes.equals(readFileSync(golden(file))), file).toBe(true);
    expect(name.endsWith(file.endsWith(".ret") ? ".ret" : ".rem")).toBe(true);
  }
});

test("US4-3: conteúdo com erros pede confirmação com a quantidade; cancelar não baixa", async ({ page }) => {
  await importFile(page, golden("invalid/campos-invalidos.rem"));
  await expect(page.getByTestId("error-count")).toHaveText("7 erros");
  let downloaded = false;
  page.on("download", () => (downloaded = true));
  await page.getByTestId("export").click();
  await expect(page.getByTestId("export-errors-dialog")).toContainText("7");
  await page.getByTestId("export-cancel").click();
  await expect(page.getByTestId("export-errors-dialog")).not.toBeVisible();
  expect(downloaded).toBe(false);
  const { name } = await exportAndSave(page, () => page.getByTestId("export-confirm").click());
  expect(name).toMatch(/^cnabeditor_\d{14}\.rem$/);
});

test("FR-024/FR-025a/b: colado sem tipo ⇒ extensão → charset → download com CRLF e '?'", async ({ page }) => {
  await pasteContent(page, "LINHA COM EMOJI 😀 E €\nSEGUNDA  \n");
  await expect(page.getByTestId("direction")).toHaveText("Não identificado");
  const { name, bytes } = await exportAndSave(page, async () => {
    await page.getByTestId("ext-ret").click();
    await expect(page.getByTestId("export-errors-dialog")).toBeVisible();
    await page.getByTestId("export-confirm").click();
    const charset = page.getByTestId("export-charset-dialog");
    await expect(charset).toContainText("2 caractere(s)");
    await expect(charset).toContainText("Linha 1, posição 17");
    await expect(charset).toContainText("Linha 1, posição 21");
    await page.getByTestId("export-confirm").click();
  });
  expect(name.endsWith(".ret")).toBe(true);
  expect(bytes.toString("latin1")).toBe("LINHA COM EMOJI ? E ?\r\nSEGUNDA  \r\n");
  await expect(row(page, 1).locator(".line-text")).toHaveText("LINHA COM EMOJI 😀 E €");
});

test("cancelar na escolha de extensão não baixa", async ({ page }) => {
  await pasteContent(page, "ABC\n");
  let downloaded = false;
  page.on("download", () => (downloaded = true));
  await page.getByTestId("export").click();
  await page.getByTestId("export-cancel").click();
  await expect(page.getByTestId("export-ext-dialog")).not.toBeVisible();
  expect(downloaded).toBe(false);
});

test("US4-4: copiar entrega o conteúdo exato à área de transferência e mostra 'Copiado ✓' por 2 s", async ({ page }) => {
  await importFile(page, golden("valid/cobranca-retorno.ret"));
  // Registra o texto entregue pela página; o SO pode converter quebras de linha depois (ex.: LF → CRLF no Windows).
  await page.evaluate(() => {
    const w = window as unknown as { __copied: string | null };
    w.__copied = null;
    const clip = navigator.clipboard;
    const original = clip?.writeText?.bind(clip);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (t: string) => {
          w.__copied = t;
          await original?.(t).catch(() => undefined);
        },
      },
    });
  });
  await page.getByTestId("copy").click();
  await expect(page.getByTestId("copy")).toHaveText("Copiado ✓");
  const copied = await page.evaluate(() => (window as unknown as { __copied: string }).__copied);
  expect(copied).toBe(readFileSync(golden("valid/cobranca-retorno.ret")).toString("latin1"));
  await page.clock.runFor(2100);
  await expect(page.getByTestId("copy")).toHaveText("Copiar");
});

test("exportar e copiar desabilitados sem conteúdo; link do manual em nova aba", async ({ page }) => {
  await expect(page.getByTestId("export")).toBeDisabled();
  await expect(page.getByTestId("copy")).toBeDisabled();
  const link = page.getByTestId("manual-link");
  await expect(link).toHaveText("Layout Padrão CNAB 240 – V10.11 – 21/08/2023");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("href", /cmsarquivos\.febraban\.org\.br/);
});

test("US4-1a: falha na exportação gera toast de erro", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error("sem espaço em disco");
    };
  });
  await page.getByTestId("export").click();
  await expect(toast(page, "Arquivo não exportado: sem espaço em disco")).toHaveAttribute("data-kind", "error");
});

test("após exportar, importar não pede confirmação; flags 'alterada' são mantidas", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await row(page, 3).click();
  await fieldInput(page, "nomeFavorecido").fill("OUTRO");
  await page.getByTestId("update-line").click();
  await exportAndSave(page);
  await expect(row(page, 3)).toHaveAttribute("data-changed", "true");
  await importFile(page, golden("valid/quebras-mistas.txt"));
  await expect(page.getByTestId("replace-content-dialog")).not.toBeVisible();
  await expect(page.getByTestId("line-count")).toHaveText("5 linhas");
});
