import { decodeLatin1, decodeUtf8, detectEncoding, stripBom } from "./encoding";
import { definitionOf, resolveRecords } from "./resolve";
import { splitRecords } from "./split";
import type { CnabDocument, CnabRecord, Direction, Encoding, LayoutDefinition } from "./types";

const ACCEPTED = /\.(rem|ret|txt)$/i;

/** Layout de cada documento carregado, para funções que recebem só o documento. */
const docLayouts = new WeakMap<CnabDocument, LayoutDefinition>();

/** FR-005: .rem, .ret ou .txt, sem diferenciar maiúsculas. */
export function isAcceptedExtension(fileName: string): boolean {
  return ACCEPTED.test(fileName);
}

function buildDocument(text: string, layout: LayoutDefinition, meta: Pick<CnabDocument, "origin" | "fileName" | "encoding" | "bom">): CnabDocument {
  const records: CnabRecord[] = splitRecords(text).map((r, index) => ({
    index,
    original: r.content,
    current: r.content,
    terminator: r.terminator,
    definitionId: null,
    label: "?",
    batchContext: null,
  }));
  resolveRecords(records, layout);
  const doc: CnabDocument = {
    ...meta,
    direction: "unknown",
    records,
    flags: new Uint8Array(records.length),
    hasUnexportedChanges: false,
  };
  if (meta.fileName === undefined) delete doc.fileName;
  docLayouts.set(doc, layout);
  doc.direction = detectDirectionWith(doc, layout);
  return doc;
}

/** Lê bytes de um arquivo importado: encoding/BOM detectados, terminadores preservados por registro (R2, R3). */
export function decodeFile(bytes: Uint8Array, fileName: string, layout: LayoutDefinition): CnabDocument {
  const encoding: Encoding = detectEncoding(bytes);
  const { bom, body } = encoding === "utf-8" ? stripBom(bytes) : { bom: false, body: bytes };
  const text = encoding === "utf-8" ? decodeUtf8(body) : decodeLatin1(body);
  return buildDocument(text, layout, { origin: "file", fileName, encoding, bom });
}

/** Texto confirmado na janela "Colar conteúdo" (FR-006b): nenhum caractere é alterado. */
export function fromPastedText(text: string, layout: LayoutDefinition): CnabDocument {
  return buildDocument(text, layout, { origin: "paste", fileName: undefined, encoding: "iso-8859-1", bom: false });
}

/** FR-007: campo "Código Remessa/Retorno" do primeiro Header de Arquivo, lido pela definição. */
export function detectDirectionWith(doc: CnabDocument, layout: LayoutDefinition): Direction {
  for (const rec of doc.records) {
    const def = definitionOf(layout, rec.definitionId);
    if (def?.kind !== "fileHeader") continue;
    const field = def.fields.find((f) => f.id === "codigoRemessaRetorno");
    if (!field) return "unknown";
    const value = rec.current.slice(field.start - 1, field.end);
    return value === "1" ? "remessa" : value === "2" ? "retorno" : "unknown";
  }
  return "unknown";
}

/** FR-007. O layout padrão é o usado na carga do documento. */
export function detectDirection(doc: CnabDocument, layout?: LayoutDefinition): Direction {
  return detectDirectionWith(doc, layout ?? docLayouts.get(doc)!);
}
