import { expect, test, type Page } from "@playwright/test";
import { field, fieldInput, golden, importFile, lineText, row } from "./helpers";

const errorCount = (page: Page) => page.getByTestId("error-count");
const toast = (page: Page, text: string) => page.getByTestId("toast").filter({ hasText: text });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await importFile(page, golden("valid/pagamento-remessa.rem"));
  await expect(errorCount(page)).toHaveText("0 erros");
});

test("US3-1/1a/1b: tipo a cada tecla; domínio ao sair do campo", async ({ page }) => {
  await row(page, 3).click();
  await fieldInput(page, "agenciaFavorecido").fill("0432X");
  await expect(field(page, "agenciaFavorecido").getByTestId("field-error")).toHaveText("Caractere inválido: o campo aceita apenas dígitos (0–9)");
  await fieldInput(page, "agenciaFavorecido").fill("04321");
  await expect(field(page, "agenciaFavorecido").getByTestId("field-error")).toHaveCount(0);

  await fieldInput(page, "tipoMovimento").fill("8");
  await expect(field(page, "tipoMovimento").getByTestId("field-error")).toHaveCount(0);
  await fieldInput(page, "tipoMovimento").blur();
  await expect(field(page, "tipoMovimento").getByTestId("field-error")).toHaveText('Opção inválida: "8" não é um valor permitido para este campo');
  await fieldInput(page, "tipoMovimento").fill("0");
  await fieldInput(page, "tipoMovimento").blur();
  await expect(field(page, "tipoMovimento").getByTestId("field-error")).toHaveCount(0);
});

test("US3-1c/2: botão no canto inferior esquerdo; não aceita além do tamanho", async ({ page }) => {
  const update = page.getByTestId("update-line");
  await expect(update).toContainText("Atualizar linha");
  await expect(update.locator("[data-icon=arrow-left]")).toHaveCount(1);
  const pane = await page.getByTestId("edit-pane").boundingBox();
  const btn = (await update.boundingBox())!;
  expect(btn.x - pane!.x).toBeLessThan(40);
  expect(pane!.y + pane!.height - (btn.y + btn.height)).toBeLessThan(40);

  const input = fieldInput(page, "numeroInscricaoEmpresa");
  await input.fill("");
  await input.pressSequentially("123456789012345678");
  await expect(input).toHaveValue("12345678901234");
  await expect(field(page, "numeroInscricaoEmpresa").getByTestId("field-counter")).toHaveText("14/14");
});

test("US3-3/9: atualizar linha válida altera só o campo e marca 'alterada'", async ({ page }) => {
  const before = (await lineText(page, 3))!;
  await row(page, 3).click();
  await fieldInput(page, "nomeFavorecido").fill("BELTRANO FICTICIO");
  await page.getByTestId("update-line").click();
  await expect(toast(page, "Linha 3 atualizada")).toBeVisible();
  await expect(row(page, 3)).toHaveAttribute("data-changed", "true");
  await expect(row(page, 3)).toHaveAttribute("data-error", "false");
  const after = (await lineText(page, 3))!;
  expect(after).toHaveLength(240);
  const changed = [...after].flatMap((c, i) => (c === before[i] ? [] : [i + 1]));
  expect(changed.every((p) => p >= 44 && p <= 73)).toBe(true);
  expect(after.slice(43, 73)).toBe("BELTRANO FICTICIO".padEnd(30, " "));
});

test("US3-5/5a: atualizar com erro informa, marca a linha e o indicador some ao corrigir", async ({ page }) => {
  await row(page, 3).click();
  await fieldInput(page, "dataPagamento").fill("31022026");
  await page.getByTestId("update-line").click();
  await expect(toast(page, "Linha 3 atualizada com 1 campo(s) com erro")).toBeVisible();
  await expect(row(page, 3)).toHaveAttribute("data-error", "true");
  await expect(row(page, 3)).toHaveAttribute("data-changed", "true");
  await expect(field(page, "dataPagamento").getByTestId("field-error")).toContainText("Data inválida");
  await expect(errorCount(page)).toHaveText("1 erro");

  await fieldInput(page, "dataPagamento").fill("23102026");
  await page.getByTestId("update-line").click();
  await expect(row(page, 3)).toHaveAttribute("data-error", "false");
  // US3-11: voltou ao original ⇒ sem indicador "alterada"
  await expect(row(page, 3)).toHaveAttribute("data-changed", "false");
  await expect(errorCount(page)).toHaveText("0 erros");
});

test("US3-4: edições pendentes ao trocar de linha por clique e por ↓", async ({ page }) => {
  await row(page, 3).click();
  await fieldInput(page, "nomeFavorecido").fill("PENDENTE");
  await row(page, 4).click();
  const dialog = page.getByTestId("pending-edits-dialog");
  await expect(dialog).toBeVisible();
  await page.getByTestId("pending-cancel").click();
  await expect(row(page, 3)).toHaveAttribute("aria-selected", "true");
  await expect(fieldInput(page, "nomeFavorecido")).toHaveValue("PENDENTE");

  await row(page, 3).click();
  await page.keyboard.press("ArrowDown");
  await expect(dialog).toBeVisible();
  await page.getByTestId("pending-discard").click();
  await expect(row(page, 4)).toHaveAttribute("aria-selected", "true");
  await expect(row(page, 3)).toHaveAttribute("data-changed", "false");

  await row(page, 3).click();
  await fieldInput(page, "nomeFavorecido").fill("ATUALIZADO NA TROCA");
  await row(page, 5).click();
  await page.getByTestId("pending-update").click();
  await expect(row(page, 5)).toHaveAttribute("aria-selected", "true");
  await expect(row(page, 3)).toHaveAttribute("data-changed", "true");
});

test("US3-6/7/10 + FR-016a: trailer divergente, contador navega, recálculo marca trailer", async ({ page }) => {
  await row(page, 3).click();
  await fieldInput(page, "valorPagamento").fill("999");
  await page.getByTestId("update-line").click();
  await expect(errorCount(page)).toHaveText("1 erro");
  await expect(row(page, 6)).toHaveAttribute("data-error", "true");

  await row(page, 1).click();
  await errorCount(page).click();
  await expect(row(page, 6)).toHaveAttribute("aria-selected", "true");
  await expect(fieldInput(page, "somatoriaValores")).toBeFocused();
  await expect(field(page, "somatoriaValores").getByTestId("field-error")).toHaveCount(0);

  await page.getByTestId("recalc").click();
  const dialog = page.getByTestId("recalc-dialog");
  await expect(dialog.getByTestId("recalc-change")).toHaveCount(1);
  await expect(dialog.getByTestId("recalc-change")).toContainText("Somatória");
  await expect(dialog.getByTestId("recalc-change")).toContainText("000000000000425050 → 000000000000276049");
  await page.getByTestId("recalc-close").click();
  await expect(row(page, 6)).toHaveAttribute("data-changed", "true");
  await expect(errorCount(page)).toHaveText("0 erros");
  await expect(row(page, 6)).toHaveAttribute("data-error", "false");
});

test("US3-8: totais consistentes ⇒ nenhum byte muda e informa que não havia divergências", async ({ page }) => {
  const before = await page.locator(".line-text").allTextContents();
  await page.getByTestId("recalc").click();
  await expect(page.getByTestId("recalc-dialog")).toContainText("não havia divergências");
  await expect(page.getByTestId("recalc-change")).toHaveCount(0);
  await page.getByTestId("recalc-close").click();
  expect(await page.locator(".line-text").allTextContents()).toEqual(before);
  await expect(page.locator('[data-changed="true"]')).toHaveCount(0);
});
