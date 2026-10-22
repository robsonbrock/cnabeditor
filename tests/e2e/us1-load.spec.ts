import { expect, test } from "@playwright/test";
import { field, golden, goldenText, importBuffer, importFile, lineText, pasteContent, row } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("US1-1/11: importar .rem mostra conteúdo, Remessa, linha 1 selecionada e toast", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await expect(page.getByTestId("toast").filter({ hasText: 'Arquivo "pagamento-remessa.rem" importado: 11 linhas' })).toBeVisible();
  await expect(page.getByTestId("toast").first()).toHaveAttribute("data-kind", "success");
  await expect(page.getByTestId("direction")).toHaveText("Remessa");
  await expect(row(page, 1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("record-title")).toHaveText("Header de Arquivo");
  await expect(field(page, "codigoRemessaRetorno")).toBeVisible();
});

test("US1-2: colar retorno mantém o conteúdo idêntico e mostra Retorno", async ({ page }) => {
  const text = goldenText("valid/cobranca-retorno.ret");
  await pasteContent(page, text);
  await expect(page.getByTestId("direction")).toHaveText("Retorno");
  const lines = text.split("\n");
  for (let i = 0; i < lines.length - 1; i++) expect(await lineText(page, i + 1)).toBe(lines[i]);
  await row(page, 3).click();
  await expect(row(page, 3)).toHaveAttribute("aria-selected", "true");
});

test("US1-3: cancelar a colagem não altera o quadro", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  const before = await lineText(page, 1);
  await page.getByTestId("paste").click();
  await page.getByTestId("paste-dialog").locator("textarea").fill("QUALQUER COISA");
  await page.getByTestId("paste-cancel").click();
  await expect(page.getByTestId("paste-dialog")).not.toBeVisible();
  expect(await lineText(page, 1)).toBe(before);
  await page.getByTestId("paste").click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("paste-dialog")).not.toBeVisible();
  expect(await lineText(page, 1)).toBe(before);
});

test("US1-4: quadro principal é somente leitura", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  const before = await lineText(page, 3);
  await row(page, 3).click();
  await page.keyboard.type("XYZ");
  await page.keyboard.press("Delete");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Control+V");
  expect(await lineText(page, 3)).toBe(before);
});

test("US1-5/5a: rótulos por linha e total de linhas", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await expect(page.getByTestId("line-label")).toHaveText(["HA", "HL", "A", "B", "A", "TL", "HL", "J", "J", "TL", "TA"]);
  await expect(page.getByTestId("line-count")).toHaveText("11 linhas");
  await importFile(page, golden("valid/quebras-mistas.txt"));
  await expect(page.getByTestId("line-count")).toHaveText("5 linhas");
});

test("US1-6/6a: seleção por clique e por ↓", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await row(page, 3).click();
  await expect(row(page, 3)).toHaveAttribute("aria-selected", "true");
  await expect(row(page, 1)).toHaveAttribute("aria-selected", "false");
  await page.keyboard.press("ArrowDown");
  await expect(row(page, 4)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("line-position")).toHaveText("Linha 4 de 11");
  await row(page, 11).click();
  await page.keyboard.press("ArrowDown");
  await expect(row(page, 11)).toHaveAttribute("aria-selected", "true");
});

test("US1-7/8: segmento mostra título, campos em ordem e contador", async ({ page }) => {
  await importFile(page, golden("valid/cobranca-retorno.ret"));
  await row(page, 3).click();
  await expect(page.getByTestId("record-title")).toHaveText("Detalhe – Segmento T");
  await row(page, 1).click();
  const f = field(page, "numeroInscricaoEmpresa");
  await expect(f.getByTestId("field-pos")).toHaveText("19–32");
  await expect(f.getByTestId("field-counter")).toHaveText("14/14");
  await expect(page.getByTestId("field").first().getByTestId("field-pos")).toHaveText("1–3");
});

test("US1-10: extensão não aceita é recusada com toast de erro", async ({ page }) => {
  await importBuffer(page, "dados.csv", Buffer.from("a;b"));
  const toast = page.getByTestId("toast").filter({ hasText: "Arquivo não importado: extensão não aceita. Use .rem, .ret ou .txt" });
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute("data-kind", "error");
  await expect(page.getByText("Não há conteúdo para exibir")).toBeVisible();
});

test("US1-11: falha de leitura gera toast de erro", async ({ page }) => {
  await page.evaluate(() => {
    File.prototype.arrayBuffer = () => Promise.reject(new Error("falha simulada"));
  });
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await expect(page.getByTestId("toast").filter({ hasText: "Arquivo não importado:" })).toHaveAttribute("data-kind", "error");
});

test("FR-008: importar com edições pendentes pede confirmação", async ({ page }) => {
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await field(page, "nomeEmpresa").getByTestId("input").fill("OUTRO NOME");
  await importFile(page, golden("valid/quebras-mistas.txt"));
  await expect(page.getByTestId("replace-content-dialog")).toBeVisible();
  await page.getByTestId("replace-cancel").click();
  await expect(page.getByTestId("line-count")).toHaveText("11 linhas");
  await importFile(page, golden("valid/quebras-mistas.txt"));
  await page.getByTestId("replace-confirm").click();
  await expect(page.getByTestId("line-count")).toHaveText("5 linhas");
});
