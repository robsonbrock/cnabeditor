import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { fieldInput, golden, goldenText, importBuffer, importFile, pasteContent, row } from "./helpers";

// Modo e2e: o dataLayer fica em memória e nada vai ao Google (005, US2, research A8).
type Ev = { name: string; params: Record<string, unknown> };

const events = (page: Page): Promise<Ev[]> =>
  page.evaluate(() =>
    (window.dataLayer ?? [])
      .map((e) => Array.from(e as ArrayLike<unknown>))
      .filter((e) => e[0] === "event")
      .map((e) => ({ name: e[1] as string, params: (e[2] ?? {}) as Record<string, unknown> })),
  );
const names = async (page: Page) => (await events(page)).map((e) => e.name);
/** Esvazia a fila para comparar só os eventos do trecho seguinte. */
const reset = (page: Page) => page.evaluate(() => void (window.dataLayer!.length = 0));

const PAGAMENTO = "valid/pagamento-remessa.rem";
const INVALIDO = "invalid/campos-invalidos.rem";
const PAGAMENTO_LINHAS = 11;
const INVALIDO_ERROS = 7;

test.beforeEach(async ({ page }) => {
  page.on("request", (r) => {
    if (/google|googletagmanager/.test(r.url())) throw new Error(`requisição ao Google: ${r.url()}`);
  });
  await page.goto("/");
});

async function edit(page: Page, value = "999") {
  await row(page, 3).click();
  await fieldInput(page, "valorPagamento").fill(value);
}

async function exportDownload(page: Page, confirm: () => Promise<void> = async () => {}) {
  const download = page.waitForEvent("download");
  await page.getByTestId("export").click();
  await confirm();
  await (await download).path();
}

async function generate(page: Page) {
  await page.getByTestId("generate").click();
  await page.getByTestId("generator-variant-segmento-a-pagamento").check();
  await page.getByTestId("generator-bank").fill("033");
  await page.getByTestId("generator-confirm").click();
  await expect(page.getByTestId("line-count")).toHaveText("14 linhas");
}

test("importar: concluída e extensão recusada", async ({ page }) => {
  await importFile(page, golden(PAGAMENTO));
  await expect(page.getByTestId("line-count")).toHaveText(`${PAGAMENTO_LINHAS} linhas`);
  await importBuffer(page, "relatorio.pdf", Buffer.from("x"));
  await expect.poll(() => events(page)).toEqual([
    { name: "importar_arquivo", params: { resultado: "concluida", extensao: "rem", layout: "cnab240", direcao: "remessa", linhas: PAGAMENTO_LINHAS } },
    { name: "importar_arquivo", params: { resultado: "erro", motivo: "extensao", extensao: "outra", layout: "cnab240" } },
  ]);
});

test("colar: cancelada e concluída", async ({ page }) => {
  await page.getByTestId("paste").click();
  await page.getByTestId("paste-cancel").click();
  await pasteContent(page, readFileSync(golden(PAGAMENTO), "latin1"));
  await expect(page.getByTestId("line-count")).toHaveText(`${PAGAMENTO_LINHAS} linhas`);
  expect(await events(page)).toEqual([
    { name: "colar_conteudo", params: { resultado: "cancelada" } },
    { name: "colar_conteudo", params: { resultado: "concluida", layout: "cnab240", direcao: "remessa", linhas: PAGAMENTO_LINHAS } },
  ]);
});

test("substituir conteúdo: cancelada e confirmada", async ({ page }) => {
  await importFile(page, golden(PAGAMENTO));
  await expect(page.getByTestId("line-count")).toHaveText(`${PAGAMENTO_LINHAS} linhas`);
  await edit(page);
  await page.getByTestId("update-line").click();
  await reset(page);

  await importFile(page, golden(INVALIDO));
  await page.getByTestId("replace-cancel").click();
  await importFile(page, golden(INVALIDO));
  await page.getByTestId("replace-confirm").click();
  await expect(page.getByTestId("line-count")).toHaveText("5 linhas");
  expect(await names(page)).toEqual(["importar_arquivo", "substituir_conteudo", "importar_arquivo", "substituir_conteudo"]);
  const replaces = (await events(page)).filter((e) => e.name === "substituir_conteudo").map((e) => e.params);
  expect(replaces).toEqual([
    { resultado: "cancelada", origem: "arquivo" },
    { resultado: "confirmada", origem: "arquivo" },
  ]);
});

test("edição: atualizar, descartar e edições pendentes", async ({ page }) => {
  await importFile(page, golden(PAGAMENTO));
  await expect(page.getByTestId("line-count")).toHaveText(`${PAGAMENTO_LINHAS} linhas`);
  await reset(page);
  await edit(page);
  await page.getByTestId("update-line").click();
  await edit(page, "123");
  await page.getByTestId("discard").click();
  await edit(page, "456");
  await row(page, 5).click();
  await page.getByTestId("pending-cancel").click();
  expect(await events(page)).toEqual([
    {
      name: "atualizar_linha",
      params: { tipo_registro: "detalhe", segmento: "a", servico: "pagamento-credito", campos_alterados: 1, com_erros: "nao" },
    },
    { name: "descartar_edicao", params: { tipo_registro: "detalhe" } },
    { name: "edicoes_pendentes", params: { escolha: "cancelar" } },
  ]);
});

test("recalcular totais e próximo erro", async ({ page }) => {
  await importFile(page, golden(PAGAMENTO));
  await expect(page.getByTestId("line-count")).toHaveText(`${PAGAMENTO_LINHAS} linhas`);
  await edit(page);
  await page.getByTestId("update-line").click();
  await reset(page);
  await page.getByTestId("recalc").click();
  await page.getByTestId("recalc-close").click();
  const [recalc] = await events(page);
  expect(recalc.name).toBe("recalcular_totais");
  expect(recalc.params).toEqual({ campos_alterados: expect.any(Number), erros: expect.any(Number) });

  await importFile(page, golden(INVALIDO));
  await page.getByTestId("replace-confirm").click();
  await expect(page.getByTestId("error-count")).toHaveText(`${INVALIDO_ERROS} erros`);
  await reset(page);
  await page.getByTestId("error-count").click();
  expect(await events(page)).toEqual([{ name: "proximo_erro", params: { erros: INVALIDO_ERROS } }]);
});

test("exportar e copiar", async ({ page }) => {
  await importFile(page, golden(PAGAMENTO));
  await expect(page.getByTestId("line-count")).toHaveText(`${PAGAMENTO_LINHAS} linhas`);
  await reset(page);
  await exportDownload(page);
  await page.getByTestId("copy").click();
  await expect.poll(() => names(page)).toEqual(["exportar_arquivo", "copiar_conteudo"]);
  const [exp, copy] = await events(page);
  expect(exp.params).toEqual({ resultado: "concluida", extensao: "rem", com_erros: "nao", erros: 0, linhas: PAGAMENTO_LINHAS });
  expect(copy.params).toEqual({ resultado: expect.stringMatching(/^(concluida|erro)$/), linhas: PAGAMENTO_LINHAS });

  await importFile(page, golden(INVALIDO));
  await expect(page.getByTestId("error-count")).toHaveText(`${INVALIDO_ERROS} erros`);
  await reset(page);
  await page.getByTestId("export").click();
  await page.getByTestId("export-cancel").click();
  await exportDownload(page, () => page.getByTestId("export-confirm").click());
  expect(await events(page)).toEqual([
    { name: "exportar_arquivo", params: { resultado: "cancelada", extensao: "rem", com_erros: "sim", erros: INVALIDO_ERROS, linhas: 5 } },
    { name: "exportar_arquivo", params: { resultado: "concluida", extensao: "rem", com_erros: "sim", erros: INVALIDO_ERROS, linhas: 5 } },
  ]);
});

test("gerador: origens, cancelada e concluída", async ({ page }) => {
  await page.getByTestId("generate").click();
  await page.getByTestId("generator-cancel").click();
  await page.getByTestId("generate-empty").click();
  await page.getByTestId("generator-cancel").click();
  await generate(page);
  expect(await names(page)).toEqual(["abrir_gerador", "gerar_massa", "abrir_gerador", "gerar_massa", "abrir_gerador", "gerar_massa"]);
  const all = await events(page);
  expect(all[0].params).toEqual({ origem: "cabecalho" });
  expect(all[1].params).toMatchObject({ resultado: "cancelada", layout: "cnab240", direcao: "remessa", qtd_variantes: 0 });
  expect(all[2].params).toEqual({ origem: "quadro_vazio" });
  expect(all[5].params).toEqual({
    resultado: "concluida",
    layout: "cnab240",
    direcao: "remessa",
    variantes: "segmento-a-pagamento",
    qtd_variantes: 1,
    qtd_registros: 10,
    com_conta_empresa: "nao",
    linhas: 14,
  });
});

test("tema e quebra de linha", async ({ page }) => {
  await page.getByTestId("theme-toggle").click();
  await page.getByTestId("wrap-toggle").click();
  expect(await events(page)).toEqual([
    { name: "trocar_tema", params: { tema: "claro" } },
    { name: "alternar_quebra", params: { quebra: "desligada" } },
  ]);
});

test("auditoria: nenhum dado do arquivo no dataLayer (SC-002)", async ({ page }) => {
  await importFile(page, golden(PAGAMENTO));
  await expect(page.getByTestId("line-count")).toHaveText(`${PAGAMENTO_LINHAS} linhas`);
  await edit(page);
  await page.getByTestId("update-line").click();
  await page.getByTestId("recalc").click();
  await page.getByTestId("recalc-close").click();
  await exportDownload(page);
  await page.getByTestId("generate").click();
  await page.getByTestId("generator-variant-segmento-a-pagamento").check();
  await page.getByTestId("generator-bank").fill("033");
  await page.getByTestId("generator-confirm").click();
  // Com conteúdo no quadro, o gerador sempre pede confirmação (FR-029).
  await page.getByTestId("replace-confirm").click();
  await expect(page.getByTestId("line-count")).toHaveText("14 linhas");

  const serialized = await page.evaluate(() => JSON.stringify(window.dataLayer));
  expect(serialized).not.toContain("pagamento-remessa");
  expect(serialized).not.toContain("EMPRESA FICTICIA");
  expect(serialized).not.toContain("999");
  for (const line of goldenText(PAGAMENTO).split(/\r?\n/)) {
    for (const token of line.match(/\S{8,}/g) ?? []) expect(serialized, token).not.toContain(token);
  }
  for (const { params } of await events(page)) {
    for (const v of Object.values(params)) if (typeof v === "string") expect(v).toMatch(/^[a-z0-9_,-]{1,100}$/);
  }
});

test("aviso em tela estreita, nos dois temas (005, US3)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  const notice = page.getByTestId("app-footer").getByTestId("analytics-notice");
  const scrollWidth = () => page.evaluate(() => document.documentElement.scrollWidth);
  for (const theme of ["dark", "light"]) {
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(notice).toBeVisible();
    // O cabeçalho já alarga a página em 375 px (004, T002): o aviso não pode alargá-la mais.
    const withNotice = await scrollWidth();
    await notice.evaluate((el) => ((el as HTMLElement).style.display = "none"));
    const without = await scrollWidth();
    await notice.evaluate((el) => ((el as HTMLElement).style.display = ""));
    expect(withNotice).toBeLessThanOrEqual(without);
    if (theme === "dark") await page.getByTestId("theme-toggle").click();
  }
});
