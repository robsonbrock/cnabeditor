import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFS, loadPrefs, PREFS_KEY, savePrefs } from "../../src/ui/prefs";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

let storage: MemoryStorage;

describe("preferências (contracts/preferences.md)", () => {
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("chave cnabeditor.prefs.v1 e padrões", () => {
    expect(PREFS_KEY).toBe("cnabeditor.prefs.v1");
    expect(DEFAULT_PREFS).toEqual({ theme: "dark", wrap: true, splitMainPct: 55, splitRightPct: 55 });
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
  });

  it("grava e restaura", () => {
    savePrefs({ theme: "light", wrap: false, splitMainPct: 40, splitRightPct: 70 }, storage);
    expect(JSON.parse(storage.getItem(PREFS_KEY)!)).toEqual({ theme: "light", wrap: false, splitMainPct: 40, splitRightPct: 70 });
    expect(loadPrefs(storage)).toEqual({ theme: "light", wrap: false, splitMainPct: 40, splitRightPct: 70 });
  });

  it("campo ausente, de tipo errado ou fora da faixa ⇒ padrão daquele campo", () => {
    storage.setItem(PREFS_KEY, JSON.stringify({ theme: "blue", wrap: "sim", splitMainPct: 95, splitRightPct: 30 }));
    expect(loadPrefs(storage)).toEqual({ theme: "dark", wrap: true, splitMainPct: 55, splitRightPct: 30 });
    storage.setItem(PREFS_KEY, JSON.stringify({ splitMainPct: 9.9, splitRightPct: "50" }));
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
    storage.setItem(PREFS_KEY, JSON.stringify({ splitMainPct: 10, splitRightPct: 90 }));
    expect(loadPrefs(storage)).toMatchObject({ splitMainPct: 10, splitRightPct: 90 });
  });

  it("JSON inválido ou armazenamento lançando exceção ⇒ padrões, sem erro", () => {
    storage.setItem(PREFS_KEY, "{nao é json");
    expect(loadPrefs(storage)).toEqual(DEFAULT_PREFS);
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(loadPrefs(broken)).toEqual(DEFAULT_PREFS);
    expect(() => savePrefs(DEFAULT_PREFS, broken)).not.toThrow();
    expect(loadPrefs(null)).toEqual(DEFAULT_PREFS);
  });

  it("nada além das preferências é gravado", () => {
    savePrefs({ ...DEFAULT_PREFS, extra: "conteúdo" } as never, storage);
    expect([...storage.data.keys()]).toEqual([PREFS_KEY]);
    expect(Object.keys(JSON.parse(storage.getItem(PREFS_KEY)!)).sort()).toEqual(["splitMainPct", "splitRightPct", "theme", "wrap"]);
  });
});
