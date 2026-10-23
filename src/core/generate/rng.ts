// Gerador pseudoaleatório determinístico (research G5): mesma semente ⇒ mesma massa.

export interface Rng {
  /** [0, 1) */
  next(): number;
  /** Inteiro em [min, max], inclusivo. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** n dígitos decimais. */
  digits(n: number): string;
}

/** mulberry32: 32 bits de estado, período 2^32, suficiente para massas de teste. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (items) => items[int(0, items.length - 1)],
    digits: (n) => {
      let out = "";
      for (let i = 0; i < n; i++) out += String(int(0, 9));
      return out;
    },
  };
}
