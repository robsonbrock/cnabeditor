import type { Encoding } from "./types";

const BOM = [0xef, 0xbb, 0xbf];

export function hasBom(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === BOM[0] && bytes[1] === BOM[1] && bytes[2] === BOM[2];
}

export function stripBom(bytes: Uint8Array): { bom: boolean; body: Uint8Array } {
  return hasBom(bytes) ? { bom: true, body: bytes.subarray(3) } : { bom: false, body: bytes };
}

/** R2: utf-8 só se decodifica sem erro E há algum byte >= 0x80; senão iso-8859-1. */
export function detectEncoding(bytes: Uint8Array): Encoding {
  if (!bytes.some((b) => b >= 0x80)) return "iso-8859-1";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "utf-8";
  } catch {
    return "iso-8859-1";
  }
}

/**
 * Byte → code point idêntico. Não usa TextDecoder("iso-8859-1"), que o WHATWG mapeia para
 * windows-1252 e quebraria a ida e volta de 0x80–0x9F.
 */
export function decodeLatin1(bytes: Uint8Array): string {
  let out = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return out;
}

export function decodeUtf8(bytes: Uint8Array): string {
  // ignoreBOM: o BOM já foi removido por stripBom; um BOM no meio do texto é conteúdo.
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
}

/** 1 byte por code point; code point > 0xFF vira "?" (0x3F). index conta code points. */
export function encodeLatin1(text: string): { bytes: Uint8Array; unmappable: { index: number; char: string }[] } {
  const out = new Uint8Array(text.length);
  const unmappable: { index: number; char: string }[] = [];
  let n = 0;
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp > 0xff) {
      unmappable.push({ index: n, char });
      out[n++] = 0x3f;
    } else {
      out[n++] = cp;
    }
  }
  return { bytes: out.slice(0, n), unmappable };
}

export function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}
