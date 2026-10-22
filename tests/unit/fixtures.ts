import { assembleLayout } from "../../src/layouts/assemble";
import type { FieldDefinition, LayoutDefinition, MatchRule, RecordDefinition } from "../../src/core/types";

type F = Omit<FieldDefinition, "size" | "required" | "description"> & Partial<Pick<FieldDefinition, "required" | "description">>;

const f = (field: F) => ({ required: false, description: `Descrição de ${field.name}`, ...field });

/** Campos 1–17 comuns + o resto num único campo, para registros sintéticos. */
function common(type: string, extra: F[] = [], restId = "resto"): Omit<FieldDefinition, "size">[] {
  const fields: F[] = [
    { id: "banco", name: "Banco", start: 1, end: 3, type: "N", reference: "G001" },
    { id: "lote", name: "Lote", start: 4, end: 7, type: "N", reference: "G002" },
    { id: "tipoRegistro", name: "Tipo de Registro", start: 8, end: 8, type: "N", reference: "G003", domain: { ref: "tipoRegistro" } },
    ...extra,
  ];
  const last = fields.at(-1)!.end;
  if (last < 240) fields.push({ id: restId, name: `Resto ${type}`, start: last + 1, end: 240, type: "A" });
  return fields.map(f);
}

const rec = (id: string, kind: RecordDefinition["kind"], label: string, title: string, match: MatchRule[], fields: Omit<FieldDefinition, "size">[], totals?: RecordDefinition["totals"]) => ({
  id,
  kind,
  label,
  title,
  match,
  fields,
  ...(totals ? { totals } : {}),
});

const hlFields = [
  { id: "operacao", name: "Tipo de Operação", start: 9, end: 9, type: "A" as const, batchContext: "operation" as const },
  { id: "servico", name: "Tipo de Serviço", start: 10, end: 11, type: "N" as const, batchContext: "service" as const },
  { id: "forma", name: "Forma de Lançamento", start: 12, end: 13, type: "N" as const },
  { id: "versao", name: "Versão do Layout do Lote", start: 14, end: 16, type: "N" as const, batchContext: "layoutVersion" as const },
];

const detailFields = (extra: F[] = []) => [
  { id: "sequencial", name: "Nº do Registro", start: 9, end: 13, type: "N" as const, reference: "G038" },
  { id: "segmento", name: "Segmento", start: 14, end: 14, type: "A" as const },
  ...extra,
];

/** Layout sintético mínimo, independente da transcrição do manual. */
export const testLayout: LayoutDefinition = assembleLayout(
  {
    id: "teste",
    name: "Layout de teste",
    version: "1",
    publishedAt: "2026-01-01",
    source: { title: "Teste", url: "https://example.invalid/manual.pdf" },
    recordLength: 240,
    domains: {
      tipoRegistro: [
        { code: "0", meaning: "Header de Arquivo" },
        { code: "1", meaning: "Header de Lote" },
        { code: "3", meaning: "Detalhe" },
        { code: "5", meaning: "Trailer de Lote" },
        { code: "9", meaning: "Trailer de Arquivo" },
      ],
    },
  },
  [
    rec("ha", "fileHeader", "HA", "Header de Arquivo", [{ pos: [8, 8], equals: "0" }], common("HA", [
      { id: "filler", name: "Brancos", start: 9, end: 142, type: "A" },
      { id: "codigoRemessaRetorno", name: "Código Remessa / Retorno", start: 143, end: 143, type: "N" },
    ])),
    rec("hl", "batchHeader", "HL", "Header de Lote", [{ pos: [8, 8], equals: "1" }], common("HL", hlFields)),
    rec("hl-pag", "batchHeader", "HL", "Header de Lote – Pagamentos", [{ pos: [8, 8], equals: "1" }, { pos: [10, 11], in: ["20", "30"] }], common("HL", hlFields)),
    rec("seg-a", "detail", "A", "Detalhe – Segmento A", [{ pos: [8, 8], equals: "3" }, { pos: [14, 14], equals: "A" }, { batch: "service", in: ["20", "30"] }], common("A", detailFields([
      { id: "nome", name: "Nome do Favorecido", start: 15, end: 44, type: "A" },
      { id: "numeroInscricao", name: "Número de Inscrição", start: 45, end: 58, type: "N" },
      { id: "valor", name: "Valor do Pagamento", start: 59, end: 73, type: "V", decimals: 2 },
    ]))),
    rec("seg-j", "detail", "J", "Detalhe – Segmento J", [{ pos: [8, 8], equals: "3" }, { pos: [14, 14], equals: "J" }, { batch: "service", in: ["20"] }], common("J", detailFields())),
    rec("seg-j-52", "detail", "J", "Detalhe – Segmento J-52", [{ pos: [8, 8], equals: "3" }, { pos: [14, 14], equals: "J" }, { batch: "service", in: ["20"] }, { pos: [18, 19], equals: "52" }], common("J52", detailFields([
      { id: "movimento", name: "Movimento", start: 15, end: 17, type: "A" },
      { id: "registroOpcional", name: "Identificação Registro Opcional", start: 18, end: 19, type: "N" },
    ]))),
    rec("seg-x-1", "detail", "X", "Detalhe – Segmento X (1)", [{ pos: [8, 8], equals: "3" }, { pos: [14, 14], equals: "X" }], common("X1", detailFields())),
    rec("seg-x-2", "detail", "X", "Detalhe – Segmento X (2)", [{ pos: [8, 8], equals: "3" }, { pos: [15, 15], equals: "X" }], common("X2", detailFields())),
    rec("tl", "batchTrailer", "TL", "Trailer de Lote", [{ pos: [8, 8], equals: "5" }], common("TL", [
      { id: "filler", name: "Brancos", start: 9, end: 17, type: "A" },
      { id: "qtdRegistros", name: "Quantidade de Registros do Lote", start: 18, end: 23, type: "N" },
      { id: "somatoria", name: "Somatória dos Valores", start: 24, end: 41, type: "V", decimals: 2 },
    ]), [
      { field: "qtdRegistros", kind: "countRecords" },
      { field: "somatoria", kind: "sum", source: { records: ["seg-a"], field: "valor" } },
    ]),
    rec("ta", "fileTrailer", "TA", "Trailer de Arquivo", [{ pos: [8, 8], equals: "9" }], common("TA", [
      { id: "filler", name: "Brancos", start: 9, end: 17, type: "A" },
      { id: "qtdLotes", name: "Quantidade de Lotes do Arquivo", start: 18, end: 23, type: "N" },
      { id: "qtdRegistros", name: "Quantidade de Registros do Arquivo", start: 24, end: 29, type: "N" },
    ]), [
      { field: "qtdLotes", kind: "countBatches" },
      { field: "qtdRegistros", kind: "countRecords" },
    ]),
  ] as never,
);

/** Linha de 240 caracteres (espaços) com valores nas posições 1-based indicadas. */
export function line(values: Record<number, string>, length = 240): string {
  const chars = Array.from({ length }, () => " ");
  for (const [pos, value] of Object.entries(values)) {
    for (let i = 0; i < value.length; i++) chars[Number(pos) - 1 + i] = value[i];
  }
  return chars.join("");
}

export const L = {
  ha: (remRet = "1") => line({ 1: "341", 4: "0000", 8: "0", 143: remRet }),
  hl: (service = "20", lote = "0001") => line({ 1: "341", 4: lote, 8: "1", 9: "C", 10: service, 12: "01", 14: "046" }),
  a: (seq = "00001", valor = "000000000010000", lote = "0001") =>
    line({ 1: "341", 4: lote, 8: "3", 9: seq, 14: "A", 15: "FULANO DE TAL", 45: "00000377654540", 59: valor }),
  j: (seq = "00001") => line({ 1: "341", 4: "0001", 8: "3", 9: seq, 14: "J" }),
  j52: (seq = "00002") => line({ 1: "341", 4: "0001", 8: "3", 9: seq, 14: "J", 15: "000", 18: "52" }),
  tl: (qtd = "000004", soma = "000000000000010000", lote = "0001") => line({ 1: "341", 4: lote, 8: "5", 18: qtd, 24: soma }),
  ta: (lotes = "000001", regs = "000006") => line({ 1: "341", 4: "9999", 8: "9", 18: lotes, 24: regs }),
};
