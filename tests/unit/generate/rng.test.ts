import { describe, expect, it } from "vitest";
import { createRng } from "../../../src/core/generate/rng";

describe("createRng (mulberry32)", () => {
  it("a mesma semente produz a mesma sequência", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect(Array.from({ length: 20 }, () => a.next())).toEqual(Array.from({ length: 20 }, () => b.next()));
  });

  it("sementes diferentes produzem sequências diferentes", () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("next() fica em [0, 1)", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("int(min, max) respeita os limites inclusivos e alcança os dois extremos", () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(5, 8);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(8);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([5, 6, 7, 8]);
  });

  it("pick cobre todos os itens em 1.000 sorteios", () => {
    const rng = createRng(9);
    const items = ["A", "B", "C", "D", "E"];
    const seen = new Set(Array.from({ length: 1000 }, () => rng.pick(items)));
    expect([...seen].sort()).toEqual(items);
  });

  it("digits(n) devolve n dígitos", () => {
    const rng = createRng(11);
    for (const n of [1, 5, 14, 44]) expect(rng.digits(n)).toMatch(new RegExp(`^[0-9]{${n}}$`));
  });
});
