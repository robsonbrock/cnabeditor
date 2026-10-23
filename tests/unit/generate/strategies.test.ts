import { describe, expect, it } from "vitest";
import { createRng } from "../../../src/core/generate/rng";
import { STRATEGIES, type StrategyContext } from "../../../src/core/generate/strategies";
import type { FieldDefinition, FieldType, StrategyName } from "../../../src/core/types";

const FEBRABAN = /^[A-Z0-9 .,;:\-/()&*@'"+=?!#$%_]*$/;
const TODAY = new Date(2026, 9, 22);

const field = (type: FieldType, size: number, decimals?: number): FieldDefinition => ({
  id: "campo",
  name: "Campo",
  start: 1,
  end: size,
  size,
  type,
  decimals,
  required: false,
  description: "",
});

function ctx(f: FieldDefinition, seed = 1, scratch: Record<string, string> = {}): StrategyContext {
  let counter = 0;
  return { field: f, rng: createRng(seed), today: TODAY, direction: "remessa", scratch, nextId: () => ++counter };
}

const run = (name: StrategyName, f: FieldDefinition, seed?: number, scratch?: Record<string, string>) => STRATEGIES[name](ctx(f, seed, scratch));

/** DV independentes da implementação. */
function cpfValid(cpf: string): boolean {
  const d = [...cpf].map(Number);
  const dv = (n: number) => {
    const sum = d.slice(0, n).reduce((s, x, i) => s + x * (n + 1 - i), 0);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === d[9] && dv(10) === d[10];
}

function cnpjValid(cnpj: string): boolean {
  const d = [...cnpj].map(Number);
  const dv = (n: number) => {
    const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = d.slice(0, n).reduce((s, x, i) => s + x * w[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === d[12] && dv(13) === d[13];
}

function barcodeDvValid(code: string): boolean {
  const body = code.slice(0, 4) + code.slice(5);
  let sum = 0;
  let w = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * w;
    w = w === 9 ? 2 : w + 1;
  }
  const r = 11 - (sum % 11);
  return Number(code[4]) === (r === 0 || r === 10 || r === 11 ? 1 : r);
}

const parseDate = (v: string) => new Date(Number(v.slice(4, 8)), Number(v.slice(2, 4)) - 1, Number(v.slice(0, 2)));
const days = (d: Date) => Math.round((d.getTime() - TODAY.getTime()) / 86_400_000);

describe("estratégias de valor", () => {
  it("blank: espaços em A, zeros nos numéricos", () => {
    expect(run("blank", field("A", 5))).toBe("     ");
    expect(run("blank", field("N", 5))).toBe("00000");
    expect(run("blank", field("V", 4, 2))).toBe("0000");
  });

  it("inscricao: tipo 1/2 no campo de 1 posição e CPF/CNPJ com DV válido no número", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const scratch: Record<string, string> = {};
      const tipo = run("inscricao", field("N", 1), seed, scratch);
      expect(["1", "2"]).toContain(tipo);
      const numero = run("inscricao", field("N", 15), seed, scratch);
      expect(numero).toMatch(/^[0-9]{15}$/);
      if (tipo === "1") {
        expect(numero.slice(0, 4)).toBe("0000");
        expect(cpfValid(numero.slice(4))).toBe(true);
      } else {
        expect(numero.slice(0, 1)).toBe("0");
        expect(cnpjValid(numero.slice(1))).toBe(true);
      }
    }
  });

  it("agencia, conta, dv e banco: só dígitos, no tamanho do campo", () => {
    expect(run("agencia", field("N", 5))).toMatch(/^[0-9]{5}$/);
    expect(run("conta", field("N", 12))).toMatch(/^[0-9]{12}$/);
    expect(run("dv", field("A", 1))).toMatch(/^[0-9]$/);
    expect(run("banco", field("N", 3))).toMatch(/^[0-9]{3}$/);
  });

  it("valor: entre R$ 1,00 e R$ 50.000,00 com os decimais do campo", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const v = run("valor", field("V", 15, 2), seed);
      expect(v).toMatch(/^[0-9]{15}$/);
      expect(BigInt(v)).toBeGreaterThanOrEqual(100n);
      expect(BigInt(v)).toBeLessThanOrEqual(5_000_000n);
    }
    const five = run("valor", field("V", 15, 5));
    expect(BigInt(five) % 1000n).toBe(0n);
  });

  it("dataFutura em hoje+1..60 e dataPassada em hoje-30..-1, sempre DDMMAAAA válida", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const fut = parseDate(run("dataFutura", field("D", 8), seed));
      const past = parseDate(run("dataPassada", field("D", 8), seed));
      expect(days(fut)).toBeGreaterThanOrEqual(1);
      expect(days(fut)).toBeLessThanOrEqual(60);
      expect(days(past)).toBeGreaterThanOrEqual(-30);
      expect(days(past)).toBeLessThanOrEqual(-1);
    }
  });

  it("hora: HHMMSS válida", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const h = run("hora", field("H", 6), seed);
      expect(Number(h.slice(0, 2))).toBeLessThanOrEqual(23);
      expect(Number(h.slice(2, 4))).toBeLessThanOrEqual(59);
      expect(Number(h.slice(4, 6))).toBeLessThanOrEqual(59);
    }
  });

  it("codigoBarras44: 44 dígitos com DV geral módulo 11 na 5ª posição", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const code = run("codigoBarras44", field("N", 44), seed);
      expect(code).toMatch(/^[0-9]{44}$/);
      expect(barcodeDvValid(code)).toBe(true);
    }
  });

  it("pixKey: nunca começa por 0/1/2/3/9 e respeita o charset", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const key = run("pixKey", field("A", 79), seed);
      expect(key).toHaveLength(79);
      expect("01239").not.toContain(key[0]);
      expect(key).toMatch(FEBRABAN);
    }
  });

  it("nomes, endereço e cidade: só charset FEBRABAN e no tamanho do campo", () => {
    for (const name of ["nomePessoa", "nomeEmpresa", "endereco", "cidade"] as const) {
      for (let seed = 1; seed <= 50; seed++) {
        const v = run(name, field("A", 30), seed);
        expect(v).toHaveLength(30);
        expect(v).toMatch(FEBRABAN);
        expect(v.trimEnd().length).toBeGreaterThan(0);
      }
    }
    expect(run("endereco", field("N", 5))).toMatch(/^[0-9]{5}$/);
  });

  it("cep: 5 + 3 dígitos; uf: uma das 27 siglas", () => {
    expect(run("cep", field("N", 5))).toMatch(/^[0-9]{5}$/);
    expect(run("cep", field("A", 3))).toMatch(/^[0-9]{3}$/);
    const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
    for (let seed = 1; seed <= 100; seed++) expect(UFS).toContain(run("uf", field("A", 2), seed));
  });

  it("documento: único em 10.000 chamadas, no tamanho do campo", () => {
    const c = ctx(field("A", 20));
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const v = STRATEGIES.documento(c);
      expect(v).toHaveLength(20);
      seen.add(v);
    }
    expect(seen.size).toBe(10_000);
  });

  it("ocorrenciaRetorno: \"00\" + brancos", () => {
    expect(run("ocorrenciaRetorno", field("A", 10))).toBe("00        ");
  });
});
