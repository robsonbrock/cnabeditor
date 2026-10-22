// Gera os golden files fictícios a partir das definições de layout (tests/golden/README.md).
// Somente dados inventados (Princípio V). Uso: npx tsx scripts/generate-golden.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadLayoutFromDir } from "../src/layouts/node-loader";
import type { FieldDefinition, RecordDefinition } from "../src/core/types";

const root = join(import.meta.dirname, "..");
const layout = loadLayoutFromDir(join(root, "src/layouts/febraban-cnab240-v10.11"));
const outDir = join(root, "tests/golden/febraban-cnab240-v10.11");

const defOf = (id: string): RecordDefinition => {
  const def = layout.records.find((r) => r.id === id);
  if (!def) throw new Error(`definição inexistente: ${id}`);
  return def;
};
const domainOf = (f: FieldDefinition) => (Array.isArray(f.domain) ? f.domain : f.domain ? layout.domains[f.domain.ref] : undefined);
const pad = (f: FieldDefinition, v: string) => (f.type === "A" ? v.padEnd(f.size, " ") : v.padStart(f.size, "0"));
const byRef = (def: RecordDefinition, ref: string) => def.fields.find((f) => f.reference === ref);

/** Monta uma linha de 240 posições: padrão do tipo → valores do `match` → valores informados. */
function build(def: RecordDefinition, values: Record<string, string>): string {
  const chars = Array.from({ length: layout.recordLength }, () => " ");
  const put = (start: number, v: string) => [...v].forEach((c, i) => (chars[start - 1 + i] = c));
  for (const f of def.fields) {
    const dom = domainOf(f);
    // Obrigatórios recebem um valor válido: 1º código do domínio, data fictícia ou texto.
    const fallback = f.type === "D" ? "22102026" : f.type === "A" ? "X" : "";
    put(f.start, pad(f, f.required ? (dom ? dom[0].code : fallback) : ""));
  }
  for (const m of def.match) if ("pos" in m) put(m.pos[0], "equals" in m ? m.equals : m.in[0]);
  for (const [id, v] of Object.entries(values)) {
    const f = def.fields.find((x) => x.id === id);
    if (!f) throw new Error(`${def.id}: campo inexistente ${id}`);
    if ([...v].length > f.size) throw new Error(`${def.id}.${id}: "${v}" maior que ${f.size}`);
    put(f.start, pad(f, v));
  }
  return chars.join("");
}

type Part = { rec: string; v?: Record<string, string> } | { raw: string };

const setField = (line: string, f: FieldDefinition, v: string) => line.slice(0, f.start - 1) + v + line.slice(f.end);

/** Monta o arquivo: lote (G002), sequencial no lote (G038) e totalizadores calculados com BigInt. */
function assemble(parts: Part[]): string[] {
  const lines = parts.map((p) => ("raw" in p ? p.raw : build(defOf(p.rec), p.v ?? {})));
  const defs = parts.map((p) => ("raw" in p ? null : defOf(p.rec)));
  let lote = 0;
  let seq = 0;
  let batchStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const def = defs[i];
    if (!def) {
      if (batchStart >= 0) seq++;
      continue;
    }
    const loteField = byRef(def, "G002");
    if (def.kind === "batchHeader") {
      lote++;
      seq = 0;
      batchStart = i;
    } else if (batchStart >= 0 && def.kind !== "batchTrailer") {
      seq++;
      const seqField = byRef(def, "G038");
      if (seqField) lines[i] = setField(lines[i], seqField, String(seq).padStart(seqField.size, "0"));
    }
    const loteValue = def.kind === "fileHeader" ? 0 : def.kind === "fileTrailer" ? 9999 : lote;
    if (loteField) lines[i] = setField(lines[i], loteField, String(loteValue).padStart(4, "0"));
    if (def.kind === "batchTrailer") {
      for (const t of def.totals ?? []) {
        const f = def.fields.find((x) => x.id === t.field)!;
        let value = 0n;
        if (t.kind === "countRecords") value = BigInt(i - batchStart + 1);
        if (t.kind === "sum") {
          for (let j = batchStart + 1; j < i; j++) {
            if (defs[j] && t.source!.records.includes(defs[j]!.id)) {
              const sf = defs[j]!.fields.find((x) => x.id === t.source!.field)!;
              value += BigInt(lines[j].slice(sf.start - 1, sf.end));
            }
          }
        }
        lines[i] = setField(lines[i], f, value.toString().padStart(f.size, "0"));
      }
      batchStart = -1;
    }
    if (def.kind === "fileTrailer") {
      for (const t of def.totals ?? []) {
        const f = def.fields.find((x) => x.id === t.field)!;
        const value = t.kind === "countBatches" ? defs.filter((d) => d?.kind === "batchHeader").length : lines.length;
        lines[i] = setField(lines[i], f, String(value).padStart(f.size, "0"));
      }
    }
  }
  return lines;
}

// ---------- Dados fictícios ----------

const BANCO = { codigoBanco: "999" };
const EMPRESA = {
  tipoInscricaoEmpresa: "2",
  numeroInscricaoEmpresa: "11222333000181",
  agencia: "01234",
  numeroConta: "000000567890",
  digitoConta: "1",
  nomeEmpresa: "EMPRESA FICTICIA TESTES LTDA",
};

const ha = (remRet: "1" | "2", extra: Record<string, string> = {}) => ({
  rec: "header-arquivo",
  v: { ...BANCO, ...EMPRESA, nomeBanco: "BANCO FICTICIO S.A.", codigoRemessaRetorno: remRet, dataGeracao: "22102026", horaGeracao: "115207", sequencialArquivo: "1", versaoLayoutArquivo: "103", ...extra },
});
const ta = () => ({ rec: "trailer-arquivo", v: BANCO });

const hlCredito = () => ({ rec: "header-lote-pagamento-credito", v: { ...BANCO, ...EMPRESA, tipoOperacao: "C", tipoServico: "20", formaLancamento: "01", versaoLayoutLote: "046", cidade: "SAO PAULO", estado: "SP" } });
const segA = (nome: string, valor: string, extra: Record<string, string> = {}) => ({
  rec: "segmento-a-pagamento",
  v: { ...BANCO, tipoMovimento: "0", codigoInstrucaoMovimento: "00", camaraCentralizadora: "000", bancoFavorecido: "999", agenciaFavorecido: "04321", contaFavorecido: "000000123456", digitoConta: "7", nomeFavorecido: nome, seuNumero: "PGTO0001", dataPagamento: "23102026", tipoMoeda: "BRL", valorPagamento: valor, ...extra },
});
const segB = (cpf: string) => ({ rec: "segmento-b-pagamento", v: { ...BANCO, tipoInscricaoFavorecido: "1", numeroInscricaoFavorecido: cpf, informacao10: "RUA DAS FLORES" } });
const tlPag = () => ({ rec: "trailer-lote-pagamento", v: BANCO });
const hlTitulos = () => ({ rec: "header-lote-pagamento-titulos", v: { ...BANCO, ...EMPRESA, tipoOperacao: "C", tipoServico: "20", formaLancamento: "31", versaoLayoutLote: "040" } });
const segJ = (valor: string) => ({
  rec: "segmento-j-pagamento",
  v: { ...BANCO, tipoMovimento: "0", codigoInstrucaoMovimento: "00", codigoBarras: "99991234500000150000000000000000000000000001", nomeBeneficiario: "BENEFICIARIO FICTICIO SA", dataVencimento: "30102026", valorTitulo: valor, dataPagamento: "23102026", valorPagamento: valor, codigoMoeda: "09" },
});
const segJ52 = () => ({
  rec: "segmento-j-52-pagamento",
  v: { ...BANCO, codigoMovimento: "01", tipoInscricaoPagador: "2", numeroInscricaoPagador: "011222333000181", nomePagador: "EMPRESA FICTICIA TESTES LTDA", tipoInscricaoBeneficiario: "2", numeroInscricaoBeneficiario: "099888777000155", nomeBeneficiario: "BENEFICIARIO FICTICIO SA", tipoInscricaoSacador: "0" },
});

const hlCobranca = (op: "R" | "T") => ({ rec: "header-lote-cobranca", v: { ...BANCO, tipoOperacao: op, tipoServico: "01", versaoLayoutLote: "060", tipoInscricaoEmpresa: "2", numeroInscricaoEmpresa: "011222333000181", agencia: "01234", conta: "000000567890", dvConta: "1", nomeEmpresa: "EMPRESA FICTICIA TESTES LTDA", numeroRemessaRetorno: "1", dataGravacao: "22102026" } });
const segT = (doc: string, valor: string) => ({
  rec: "segmento-t-cobranca",
  v: { ...BANCO, codigoMovimento: "06", agencia: "01234", conta: "000000567890", dvConta: "1", nossoNumero: `NN${doc}`, carteira: "1", numeroDocumento: `DOC${doc}`, dataVencimento: "30102026", valorTitulo: valor, codigoMoeda: "09", tipoInscricaoPagador: "1", numeroInscricaoPagador: "000012345678909", nomePagador: "PAGADOR FICTICIO DA SILVA" },
});
const segU = (valor: string) => ({ rec: "segmento-u-cobranca", v: { ...BANCO, codigoMovimento: "06", valorPago: valor, valorLiquido: valor, dataOcorrencia: "22102026", dataCredito: "23102026" } });
const tlCobranca = () => ({ rec: "trailer-lote-cobranca", v: BANCO });

// ---------- Escrita ----------

type Term = "\r\n" | "\n" | "\r" | "";
interface Golden {
  dir: "valid" | "invalid";
  name: string;
  lines: string[];
  terms: Term[] | Term;
  encoding?: "latin1" | "utf8";
  bom?: boolean;
  expected: object;
}

function write(g: Golden) {
  const terms = Array.isArray(g.terms) ? g.terms : g.lines.map(() => g.terms as Term);
  const text = g.lines.map((l, i) => l + terms[i]).join("");
  const body = g.encoding === "utf8" ? Buffer.from(text, "utf8") : Buffer.from(text, "latin1");
  const bytes = g.bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body;
  const dir = join(outDir, g.dir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, g.name), bytes);
  writeFileSync(join(dir, `${g.name}.expected.json`), JSON.stringify(g.expected, null, 2) + "\n");
  console.log(`${g.dir}/${g.name}: ${g.lines.length} linhas, ${bytes.length} bytes`);
}

const labels = (parts: Part[]) => parts.map((p) => ("raw" in p ? "?" : defOf(p.rec).label));
const withEnd = (terms: Term[], last: Term) => [...terms.slice(0, -1), last];

// pagamento-remessa.rem: crédito em conta (A, B) + títulos (J, J-52); CRLF com quebra final.
const pagamento: Part[] = [
  ha("1"),
  hlCredito(),
  segA("FAVORECIDO FICTICIO UM", "150000"),
  segB("12345678909"),
  segA("FAVORECIDA FICTICIA DOIS", "275050"),
  tlPag(),
  hlTitulos(),
  segJ("150000"),
  segJ52(),
  tlPag(),
  ta(),
];
const pagamentoLines = assemble(pagamento);
write({ dir: "valid", name: "pagamento-remessa.rem", lines: pagamentoLines, terms: "\r\n", expected: { direction: "remessa", labels: labels(pagamento), errors: [] } });

// cobranca-retorno.ret: T/U com espaços finais; LF com quebra final.
const cobranca: Part[] = [ha("2"), hlCobranca("T"), segT("0001", "100000"), segU("100000"), segT("0002", "35990"), segU("35990"), tlCobranca(), ta()];
const cobrancaLines = assemble(cobranca);
write({ dir: "valid", name: "cobranca-retorno.ret", lines: cobrancaLines, terms: "\n", expected: { direction: "retorno", labels: labels(cobranca), errors: [] } });

// quebras-mistas.txt: CRLF e LF misturados, sem quebra final.
const curto: Part[] = [ha("1"), hlCredito(), segA("FAVORECIDO FICTICIO UM", "1000"), tlPag(), ta()];
write({ dir: "valid", name: "quebras-mistas.txt", lines: assemble(curto), terms: ["\r\n", "\n", "\r\n", "\n", ""], expected: { direction: "remessa", labels: labels(curto), errors: [] } });

// latin1-acentos.rem: bytes 0x80–0xFF em alfanuméricos ⇒ sinalizados (charset), nunca convertidos.
const acentos: Part[] = [ha("1", { nomeEmpresa: "EMPRESA FICTÍCIA AÇÃO LTDA" }), hlCredito(), segA("JOSÉ DA CONCEIÇÃO", "1000"), tlPag(), ta()];
const nome = (def: string, id: string) => defOf(def).fields.find((f) => f.id === id)!;
const charsetErr = (line: number, def: string, id: string, found: string) => {
  const f = nome(def, id);
  return { line, start: f.start, end: f.end, fieldId: id, rule: "charset", found };
};
const acentosLines = assemble(acentos);
write({
  dir: "valid",
  name: "latin1-acentos.rem",
  lines: acentosLines,
  terms: withEnd(acentosLines.map(() => "\r\n"), "\r\n"),
  expected: {
    direction: "remessa",
    labels: labels(acentos),
    errors: [
      charsetErr(1, "header-arquivo", "nomeEmpresa", acentosLines[0].slice(72, 102)),
      charsetErr(3, "segmento-a-pagamento", "nomeFavorecido", acentosLines[2].slice(43, 73)),
    ],
  },
});

// utf8-bom.rem: BOM UTF-8 + acentos (posições contadas em caracteres).
write({
  dir: "valid",
  name: "utf8-bom.rem",
  lines: acentosLines,
  terms: "\r\n",
  encoding: "utf8",
  bom: true,
  expected: {
    direction: "remessa",
    labels: labels(acentos),
    errors: [
      charsetErr(1, "header-arquivo", "nomeEmpresa", acentosLines[0].slice(72, 102)),
      charsetErr(3, "segmento-a-pagamento", "nomeFavorecido", acentosLines[2].slice(43, 73)),
    ],
  },
});

// ---------- Inválidos (US1) ----------

// linha-curta.rem: a linha do segmento A com 238 caracteres.
{
  const lines = assemble(curto);
  lines[2] = lines[2].slice(0, 238);
  write({ dir: "invalid", name: "linha-curta.rem", lines, terms: "\r\n", expected: { direction: "remessa", labels: labels(curto), errors: [{ line: 3, start: 1, end: 238, rule: "lineLength", found: "238", expected: "240" }] } });
}

// segmento-desconhecido.rem: detalhe com pos. 14 = "X" num lote de pagamentos.
{
  const parts: Part[] = [ha("1"), hlCredito(), segA("FAVORECIDO FICTICIO UM", "1000"), { raw: "" }, tlPag(), ta()];
  const base = assemble([ha("1"), hlCredito(), segA("FAVORECIDO FICTICIO UM", "1000"), segA("FAVORECIDO FICTICIO UM", "1000"), tlPag(), ta()]);
  parts[3] = { raw: base[3].slice(0, 13) + "X" + base[3].slice(14) };
  const lines = assemble(parts);
  write({
    dir: "invalid",
    name: "segmento-desconhecido.rem",
    lines,
    terms: "\r\n",
    expected: { direction: "remessa", labels: ["HA", "HL", "A", "X", "TL", "TA"], errors: [{ line: 4, start: 1, end: 240, rule: "unknownRecord" }] },
  });
}

// tipo-desconhecido.rem: registro com pos. 8 = "7" entre o trailer de lote e o trailer de arquivo.
{
  const raw = build(defOf("trailer-arquivo"), BANCO).slice(0, 7) + "7" + " ".repeat(232);
  const parts: Part[] = [ha("1"), hlCredito(), segA("FAVORECIDO FICTICIO UM", "1000"), tlPag(), { raw }, ta()];
  write({
    dir: "invalid",
    name: "tipo-desconhecido.rem",
    lines: assemble(parts),
    terms: "\r\n",
    expected: { direction: "remessa", labels: ["HA", "HL", "A", "TL", "?", "TA"], errors: [{ line: 5, start: 1, end: 240, rule: "unknownRecord" }] },
  });
}

// sem-header.rem: sem Header de Arquivo ⇒ direção desconhecida e sequência inválida na linha 1.
{
  const parts: Part[] = [hlCredito(), segA("FAVORECIDO FICTICIO UM", "1000"), tlPag(), ta()];
  write({
    dir: "invalid",
    name: "sem-header.rem",
    lines: assemble(parts),
    terms: "\r\n",
    expected: { direction: "unknown", labels: labels(parts), errors: [{ line: 1, start: 1, end: 240, rule: "sequence" }] },
  });
}

// ---------- Inválidos (US3) ----------

const fieldOf = (rec: string, id: string) => {
  const f = defOf(rec).fields.find((x) => x.id === id);
  if (!f) throw new Error(`${rec}: campo inexistente ${id}`);
  return f;
};
/** Grava `value` (já no tamanho do campo) na linha 1-based. */
function mutate(lines: string[], lineNo: number, rec: string, id: string, value: string): string[] {
  const f = fieldOf(rec, id);
  if (value.length !== f.size) throw new Error(`${rec}.${id}: "${value}" deveria ter ${f.size} posições`);
  const out = [...lines];
  out[lineNo - 1] = setField(out[lineNo - 1], f, value);
  return out;
}
const at = (lines: string[], lineNo: number, rec: string, id: string) => {
  const f = fieldOf(rec, id);
  return lines[lineNo - 1].slice(f.start - 1, f.end);
};
const err = (line: number, rec: string, id: string, rule: string, extra: object = {}) => {
  const f = fieldOf(rec, id);
  return { line, start: f.start, end: f.end, fieldId: id, rule, ...extra };
};

// total-divergente.rem: TL e TA com quantidades/somatórios errados.
{
  const tl = "trailer-lote-pagamento";
  const wrong: [number, string, string, string][] = [
    [6, tl, "quantidadeRegistros", "000009"],
    [6, tl, "somatoriaValores", "000000000000000001"],
    [10, tl, "somatoriaValores", "000000000000999999"],
    [11, "trailer-arquivo", "quantidadeRegistros", "000099"],
  ];
  let lines = pagamentoLines;
  for (const [n, rec, id, v] of wrong) lines = mutate(lines, n, rec, id, v);
  const mismatch = wrong.map(([n, rec, id, v]) => err(n, rec, id, "totalMismatch", { found: v, expected: at(pagamentoLines, n, rec, id) }));
  write({
    dir: "invalid",
    name: "total-divergente.rem",
    lines,
    terms: "\r\n",
    expected: {
      direction: "remessa",
      labels: labels(pagamento),
      errors: mismatch,
      recalc: wrong.map(([n, rec, id, v]) => ({ line: n, fieldId: id, from: v, to: at(pagamentoLines, n, rec, id) })),
    },
  });
}

// sequencia-invalida.rem: HL sem TL antes do próximo HL; detalhe depois do TL (fora de lote ⇒ não reconhecido).
{
  const parts: Part[] = [ha("1"), hlCredito(), segA("FAVORECIDO FICTICIO UM", "1000"), hlCredito(), segA("FAVORECIDO FICTICIO UM", "2000"), tlPag(), segA("FAVORECIDO FORA DO LOTE", "3000"), ta()];
  write({
    dir: "invalid",
    name: "sequencia-invalida.rem",
    lines: assemble(parts),
    terms: "\r\n",
    expected: {
      direction: "remessa",
      labels: ["HA", "HL", "A", "HL", "A", "TL", "A", "TA"],
      errors: [
        { line: 4, start: 1, end: 240, rule: "sequence" },
        { line: 7, start: 1, end: 240, rule: "unknownRecord" },
      ],
    },
  });
}

// numero-lote-invalido.rem: segmento A com Lote de Serviço diferente do Header de Lote.
write({
  dir: "invalid",
  name: "numero-lote-invalido.rem",
  lines: mutate(pagamentoLines, 3, "segmento-a-pagamento", "loteServico", "0003"),
  terms: "\r\n",
  expected: { direction: "remessa", labels: labels(pagamento), errors: [err(3, "segmento-a-pagamento", "loteServico", "batchNumber", { found: "0003", expected: "0001" })] },
});

// sequencial-registro-invalido.rem: Nº seqüencial do registro no lote fora de ordem.
write({
  dir: "invalid",
  name: "sequencial-registro-invalido.rem",
  lines: mutate(pagamentoLines, 5, "segmento-a-pagamento", "numeroRegistro", "00007"),
  terms: "\r\n",
  expected: { direction: "remessa", labels: labels(pagamento), errors: [err(5, "segmento-a-pagamento", "numeroRegistro", "recordSequence", { found: "00007", expected: "00003" })] },
});

// campos-invalidos.rem: letra em N, opção fora do domínio, data e hora inválidas, obrigatório vazio, minúsculas.
{
  const parts: Part[] = [
    ha("1", { horaGeracao: "250000" }),
    { rec: "header-lote-pagamento-credito", v: { ...hlCredito().v, tipoOperacao: " " } },
    segA("Fulano de Tal", "1000", { tipoMovimento: "8", agenciaFavorecido: "0A321", dataPagamento: "31022026" }),
    tlPag(),
    ta(),
  ];
  const a = "segmento-a-pagamento";
  write({
    dir: "invalid",
    name: "campos-invalidos.rem",
    lines: assemble(parts),
    terms: "\r\n",
    expected: {
      direction: "remessa",
      labels: labels(parts),
      errors: [
        err(1, "header-arquivo", "horaGeracao", "time"),
        err(2, "header-lote-pagamento-credito", "tipoOperacao", "required"),
        err(2, "header-lote-pagamento-credito", "tipoOperacao", "domain"),
        err(3, a, "tipoMovimento", "domain"),
        err(3, a, "agenciaFavorecido", "type"),
        err(3, a, "nomeFavorecido", "charset"),
        err(3, a, "dataPagamento", "date"),
      ],
    },
  });
}

// somatorio-18-digitos.rem: soma > 2^53 (BigInt) com o somatório do trailer zerado.
{
  const parts: Part[] = [ha("1"), hlCredito(), ...Array.from({ length: 12 }, () => segA("FAVORECIDO FICTICIO UM", "999999999999999")), tlPag(), ta()];
  const valid = assemble(parts);
  const tlLine = parts.length - 1;
  const lines = mutate(valid, tlLine, "trailer-lote-pagamento", "somatoriaValores", "0".repeat(18));
  const to = at(valid, tlLine, "trailer-lote-pagamento", "somatoriaValores");
  if (to !== (999999999999999n * 12n).toString().padStart(18, "0")) throw new Error("somatório inesperado");
  write({
    dir: "invalid",
    name: "somatorio-18-digitos.rem",
    lines,
    terms: "\r\n",
    expected: {
      direction: "remessa",
      labels: labels(parts),
      errors: [err(tlLine, "trailer-lote-pagamento", "somatoriaValores", "totalMismatch", { found: "0".repeat(18), expected: to })],
      recalc: [{ line: tlLine, fieldId: "somatoriaValores", from: "0".repeat(18), to }],
    },
  });
}

// lote-sem-trailer.rem: o lote termina sem Trailer de Lote; o recálculo só mexe nos trailers existentes.
{
  const parts: Part[] = [ha("1"), hlCredito(), segA("FAVORECIDO FICTICIO UM", "1000"), segB("12345678909"), ta()];
  write({
    dir: "invalid",
    name: "lote-sem-trailer.rem",
    lines: assemble(parts),
    terms: "\r\n",
    expected: { direction: "remessa", labels: labels(parts), errors: [{ line: 5, start: 1, end: 240, rule: "sequence" }] },
  });
}

// ---------- Cobertura: ao menos um golden file por definição (COVERAGE.md, T097) ----------

type Ctx = Partial<Record<"operation" | "service" | "layoutVersion", string>>;

/** Valores de contexto que o HL pode produzir, respeitando o próprio `match` (posições dos campos batchContext). */
function headerOptions(hl: RecordDefinition): Record<keyof Ctx, string[] | null> {
  const out: Record<keyof Ctx, string[] | null> = { operation: null, service: null, layoutVersion: null };
  for (const f of hl.fields) {
    if (!f.batchContext) continue;
    const rule = hl.match.find((m) => "pos" in m && m.pos[0] === f.start && m.pos[1] === f.end);
    out[f.batchContext] = rule && "pos" in rule ? ("equals" in rule ? [rule.equals] : rule.in) : null;
  }
  return out;
}

/** Contexto que satisfaz as regras de lote de `def` e é compatível com o HL e com o contexto já escolhido. */
function fitContext(def: RecordDefinition, hl: RecordDefinition, current: Ctx): Ctx | null {
  const options = headerOptions(hl);
  const hasField = (k: keyof Ctx) => hl.fields.some((f) => f.batchContext === k);
  const next: Ctx = { ...current };
  for (const m of def.match) {
    if (!("batch" in m)) continue;
    if (!hasField(m.batch)) return null;
    const allowed = m.in.filter((v) => options[m.batch] === null || options[m.batch]!.includes(v));
    if (next[m.batch] !== undefined) {
      if (!allowed.includes(next[m.batch]!)) return null;
    } else {
      if (!allowed.length) return null;
      next[m.batch] = allowed[0];
    }
  }
  return next;
}

function hlValues(hl: RecordDefinition, ctx: Ctx): Record<string, string> {
  const values: Record<string, string> = { ...BANCO };
  for (const f of hl.fields) {
    if (f.batchContext && ctx[f.batchContext] !== undefined) values[f.id] = ctx[f.batchContext]!;
  }
  return values;
}

const withBank = (def: RecordDefinition) => (def.fields.some((f) => f.id === "codigoBanco") ? BANCO : {});

{
  const specificHeaders = layout.records.filter((r) => r.kind === "batchHeader" && r.id !== "header-lote");
  const members = layout.records.filter((r) => ["detail", "batchInitial", "batchFinal", "batchTrailer"].includes(r.kind) && r.id !== "trailer-lote");
  const covered = new Set<string>(["header-arquivo", "trailer-arquivo"]);
  const order = { batchInitial: 0, detail: 1, batchFinal: 2, batchTrailer: 3 } as Record<string, number>;

  for (const hl of specificHeaders) {
    // Lotes deste HL: cada um com um contexto; um membro entra no primeiro lote compatível.
    const batches: { ctx: Ctx; defs: RecordDefinition[] }[] = [];
    for (const def of members) {
      if (covered.has(def.id) && def.kind !== "batchTrailer") continue;
      let placed = false;
      for (const b of batches) {
        const ctx = fitContext(def, hl, b.ctx);
        if (ctx && !(def.kind === "batchTrailer" && b.defs.some((d) => d.kind === "batchTrailer"))) {
          b.ctx = ctx;
          b.defs.push(def);
          placed = true;
          break;
        }
      }
      if (!placed && (def.kind !== "batchTrailer" || !covered.has(def.id))) {
        const ctx = fitContext(def, hl, {});
        if (ctx) batches.push({ ctx, defs: [def] });
      }
    }
    const kept = batches.filter((b) => b.defs.some((d) => d.kind !== "batchTrailer" || !covered.has(d.id)));
    if (!kept.length && covered.has(hl.id)) continue;
    if (!kept.length) kept.push({ ctx: fitContext({ ...hl, match: [] }, hl, {})!, defs: [] });

    const parts: Part[] = [ha("1")];
    const defsOfFile: string[] = ["header-arquivo"];
    for (const b of kept) {
      // Todo lote tem trailer: o específico compatível ou, na falta, o genérico.
      if (!b.defs.some((d) => d.kind === "batchTrailer")) {
        const tl = members.find((d) => d.kind === "batchTrailer" && fitContext(d, hl, b.ctx));
        if (tl) b.ctx = fitContext(tl, hl, b.ctx)!;
        b.defs.push(tl ?? defOf("trailer-lote"));
      }
      b.defs.sort((x, y) => order[x.kind] - order[y.kind]);
      parts.push({ rec: hl.id, v: hlValues(hl, b.ctx) });
      defsOfFile.push(hl.id);
      for (const d of b.defs) {
        parts.push({ rec: d.id, v: withBank(d) });
        defsOfFile.push(d.id);
        covered.add(d.id);
      }
      covered.add(hl.id);
    }
    parts.push(ta());
    defsOfFile.push("trailer-arquivo");
    const lines = assemble(parts);
    write({
      dir: "valid",
      name: `cobertura-${hl.id.replace(/^header-lote-/, "")}.rem`,
      lines,
      terms: "\r\n",
      expected: { direction: "remessa", labels: labels(parts), definitions: defsOfFile, errors: [] },
    });
  }

  // Lote de serviço sem definição específica: HL e TL genéricos.
  {
    const parts: Part[] = [ha("1"), { rec: "header-lote", v: { ...BANCO, tipoOperacao: "C", tipoServico: "14", usoServico: "  ", versaoLayoutLote: "001" } }, { rec: "trailer-lote", v: BANCO }, ta()];
    const ids = ["header-arquivo", "header-lote", "trailer-lote", "trailer-arquivo"];
    ids.forEach((id) => covered.add(id));
    write({ dir: "valid", name: "cobertura-lote-generico.rem", lines: assemble(parts), terms: "\r\n", expected: { direction: "remessa", labels: labels(parts), definitions: ids, errors: [] } });
  }

  const missing = layout.records.map((r) => r.id).filter((id) => !covered.has(id));
  if (missing.length) throw new Error(`definições sem golden file: ${missing.join(", ")}`);
}

export { assemble, build, defOf, pagamentoLines, cobrancaLines };
