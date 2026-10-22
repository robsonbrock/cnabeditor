import type { Terminator } from "./types";

export interface SplitRecord {
  content: string;
  terminator: Terminator;
}

/** Divide em registros guardando o terminador original de cada um (R3). Nenhuma normalização. */
export function splitRecords(text: string): SplitRecord[] {
  const records: SplitRecord[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x0d) {
      const crlf = text.charCodeAt(i + 1) === 0x0a;
      records.push({ content: text.slice(start, i), terminator: crlf ? "CRLF" : "CR" });
      if (crlf) i++;
      start = i + 1;
    } else if (c === 0x0a) {
      records.push({ content: text.slice(start, i), terminator: "LF" });
      start = i + 1;
    }
  }
  if (start < text.length) records.push({ content: text.slice(start), terminator: "" });
  return records;
}

export const TERMINATOR_TEXT: Record<Terminator, string> = { CRLF: "\r\n", LF: "\n", CR: "\r", "": "" };
