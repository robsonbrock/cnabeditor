import { describe, expect, it } from "vitest";
import { resolveAround, resolveRecords } from "../../src/core/resolve";
import type { CnabRecord } from "../../src/core/types";
import { L, line, testLayout } from "./fixtures";

const records = (lines: string[]): CnabRecord[] =>
  lines.map((l, index) => ({ index, original: l, current: l, terminator: "CRLF", definitionId: null, label: "", batchContext: null }));

const resolve = (lines: string[]) => {
  const recs = records(lines);
  resolveRecords(recs, testLayout);
  return recs;
};

describe("resolveRecords", () => {
  it("identifica o tipo pela posição 8", () => {
    const recs = resolve([L.ha(), L.hl(), L.a(), L.tl(), L.ta()]);
    expect(recs.map((r) => r.definitionId)).toEqual(["ha", "hl-pag", "seg-a", "tl", "ta"]);
    expect(recs.map((r) => r.label)).toEqual(["HA", "HL", "A", "TL", "TA"]);
  });

  it("detalhes e TL herdam o contexto do HL até o TL", () => {
    const recs = resolve([L.ha(), L.hl("20"), L.a(), L.tl(), L.a(), L.ta()]);
    expect(recs[2].batchContext).toEqual({ batchIndex: 0, headerLine: 2, operation: "C", service: "20", layoutVersion: "046" });
    expect(recs[3].batchContext).toEqual(recs[2].batchContext);
    // fora de lote: sem contexto ⇒ regra batch não é satisfeita ⇒ não reconhecido, rótulo = pos. 14
    expect(recs[4].batchContext).toBeNull();
    expect(recs[4].definitionId).toBeNull();
    expect(recs[4].label).toBe("A");
  });

  it("contexto de lote decide o segmento: serviço sem definição ⇒ não reconhecido", () => {
    const recs = resolve([L.ha(), L.hl("01"), L.a(), L.tl()]);
    expect(recs[1].definitionId).toBe("hl");
    expect(recs[2].definitionId).toBeNull();
    expect(recs[2].label).toBe("A");
  });

  it("segundo lote recebe batchIndex 1", () => {
    const recs = resolve([L.ha(), L.hl(), L.tl(), L.hl("30", "0002"), L.a(), L.tl()]);
    expect(recs[4].batchContext).toMatchObject({ batchIndex: 1, headerLine: 4, service: "30" });
  });

  it("variante J-52 vence por ter mais condições satisfeitas", () => {
    const recs = resolve([L.ha(), L.hl("20"), L.j(), L.j52(), L.tl()]);
    expect(recs[2].definitionId).toBe("seg-j");
    expect(recs[3].definitionId).toBe("seg-j-52");
    expect(recs[3].label).toBe("J");
  });

  it("empate entre definições ⇒ não reconhecido; rótulo do detalhe é o caractere da pos. 14", () => {
    const recs = resolve([L.ha(), L.hl(), line({ 8: "3", 14: "X", 15: "X" }), L.tl()]);
    expect(recs[2].definitionId).toBeNull();
    expect(recs[2].label).toBe("X");
  });

  it("tipo desconhecido ⇒ rótulo ?", () => {
    const recs = resolve([line({ 8: "7" })]);
    expect(recs[0].definitionId).toBeNull();
    expect(recs[0].label).toBe("?");
  });

  it("detalhe com pos. 14 em branco ou ausente ⇒ rótulo ?", () => {
    const recs = resolve([L.hl(), line({ 8: "3" }), "0000000", L.tl()]);
    expect(recs[1].label).toBe("?");
    expect(recs[2].label).toBe("?");
  });

  it("linha curta ainda é resolvida pelas posições existentes", () => {
    const recs = resolve([L.ha().slice(0, 100)]);
    expect(recs[0].definitionId).toBe("ha");
  });

  it("não altera o conteúdo", () => {
    const lines = [L.ha(), L.hl(), L.a(), L.tl(), L.ta()];
    const recs = resolve(lines);
    expect(recs.map((r) => r.current)).toEqual(lines);
    expect(recs.map((r) => r.original)).toEqual(lines);
  });
});

describe("resolveAround", () => {
  const full = (lines: string[]) => {
    const recs = records(lines);
    resolveRecords(recs, testLayout);
    return recs;
  };
  const snapshot = (recs: CnabRecord[]) => recs.map((r) => [r.definitionId, r.label, JSON.stringify(r.batchContext)]);

  it("após editar um detalhe dá o mesmo resultado que resolver tudo", () => {
    const lines = [L.ha(), L.hl("20"), L.a(), L.j(), L.tl(), L.hl("20", "0002"), L.a(), L.tl(), L.ta()];
    const recs = full(lines);
    recs[3].current = L.a("00002");
    resolveAround(recs, testLayout, 3);
    const expected = full([...lines.slice(0, 3), L.a("00002"), ...lines.slice(4)]);
    expect(snapshot(recs)).toEqual(snapshot(expected));
  });

  it("editar o serviço do HL re-resolve os detalhes do lote", () => {
    const lines = [L.ha(), L.hl("20"), L.a(), L.tl(), L.hl("20", "0002"), L.a(), L.tl(), L.ta()];
    const recs = full(lines);
    recs[1].current = L.hl("01");
    resolveAround(recs, testLayout, 1);
    expect(recs[2].definitionId).toBeNull();
    expect(recs[5].definitionId).toBe("seg-a");
    expect(snapshot(recs)).toEqual(snapshot(full([lines[0], L.hl("01"), ...lines.slice(2)])));
  });

  it("linha que vira Header de Lote refaz a numeração dos lotes", () => {
    const lines = [L.ha(), L.hl("20"), L.a(), L.tl(), L.a(), L.hl("20", "0002"), L.a(), L.tl(), L.ta()];
    const recs = full(lines);
    recs[4].current = L.hl("30", "0002");
    resolveAround(recs, testLayout, 4);
    expect(snapshot(recs)).toEqual(snapshot(full([...lines.slice(0, 4), L.hl("30", "0002"), ...lines.slice(5)])));
  });
});

describe("resolveAround: só a linha quando o contexto não muda", () => {
  it("detalhe que troca de segmento dentro do lote", () => {
    const lines = [L.ha(), L.hl("20"), L.a(), L.j(), L.tl(), L.ta()];
    const recs = records(lines);
    resolveRecords(recs, testLayout);
    recs[3].current = L.j52();
    resolveAround(recs, testLayout, 3);
    expect(recs[3].definitionId).toBe("seg-j-52");
    recs[2].current = line({ 8: "3", 14: "Q" });
    resolveAround(recs, testLayout, 2);
    expect(recs[2]).toMatchObject({ definitionId: null, label: "Q" });
    recs[2].current = L.tl();
    resolveAround(recs, testLayout, 2);
    expect(recs[2].definitionId).toBe("tl");
    expect(recs[3].batchContext).toBeNull();
  });
});
