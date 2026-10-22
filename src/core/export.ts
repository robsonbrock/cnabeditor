import { encodeLatin1, encodeUtf8 } from "./encoding";
import { TERMINATOR_TEXT } from "./split";
import type { CnabDocument, ExportPlan } from "./types";

const BOM = [0xef, 0xbb, 0xbf];

/**
 * origin "file": encoding, BOM e terminadores originais por registro (FR-025).
 * origin "paste": ISO-8859-1, terminadores não vazios → CRLF, quebra final preservada,
 * code points > U+00FF gravados como "?" (FR-025a/b). O documento não é alterado.
 */
export function encodeForExport(doc: CnabDocument): ExportPlan {
  if (doc.origin === "paste") {
    const unmappable: ExportPlan["unmappable"] = [];
    const parts: Uint8Array[] = [];
    doc.records.forEach((rec, i) => {
      const encoded = encodeLatin1(rec.current);
      for (const u of encoded.unmappable) unmappable.push({ line: i + 1, position: u.index + 1, char: u.char });
      parts.push(encoded.bytes);
      if (rec.terminator) parts.push(CRLF);
    });
    return { bytes: concat(parts), unmappable };
  }
  const text = toClipboardText(doc);
  if (doc.encoding === "utf-8") {
    const body = encodeUtf8(text);
    return { bytes: doc.bom ? concat([new Uint8Array(BOM), body]) : body, unmappable: [] };
  }
  // Arquivo ISO-8859-1: todo caractere original veio de um byte, mas uma edição pode ter inserido outros;
  // eles também viram "?" e são listados para o aviso de exportação.
  const { bytes, unmappable } = encodeLatin1(text);
  return { bytes, unmappable: unmappable.length ? locate(doc) : [] };
}

const CRLF = new Uint8Array([0x0d, 0x0a]);

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Linha/posição dos caracteres sem representação em ISO-8859-1 (para o aviso de exportação). */
function locate(doc: CnabDocument): ExportPlan["unmappable"] {
  const out: ExportPlan["unmappable"] = [];
  doc.records.forEach((rec, i) => {
    for (const u of encodeLatin1(rec.current).unmappable) out.push({ line: i + 1, position: u.index + 1, char: u.char });
  });
  return out;
}

/** Texto para a área de transferência: conteúdo atual + terminadores originais, sem rótulos (FR-027/FR-027a). */
export function toClipboardText(doc: CnabDocument): string {
  let out = "";
  for (const rec of doc.records) out += rec.current + TERMINATOR_TEXT[rec.terminator];
  return out;
}

const two = (n: number) => String(n).padStart(2, "0");

/** cnabeditor_AAAAMMDDHHMMSS.<ext> pelo relógio local (FR-024a). */
export function exportFileName(now: Date, ext: "rem" | "ret"): string {
  const stamp = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
  return `cnabeditor_${stamp}.${ext}`;
}
