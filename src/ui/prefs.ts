import type { Preferences } from "../core/types";

/** Única informação persistida pela aplicação (FR-032, FR-034; contracts/preferences.md). */
export const PREFS_KEY = "cnabeditor.prefs.v1";

export const DEFAULT_PREFS: Preferences = { theme: "dark", wrap: true, splitMainPct: 55, splitRightPct: 55 };

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const pct = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 10 && v <= 90 ? v : fallback);

/** localStorage, ou null quando o navegador bloqueia o acesso (ex.: navegação privada restrita). */
export function browserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Falhas e valores inválidos ⇒ padrão do campo, sem erro visível. */
export function loadPrefs(storage: StorageLike | null = browserStorage()): Preferences {
  try {
    const raw = storage?.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const p = JSON.parse(raw) as Record<string, unknown>;
    return {
      theme: p.theme === "dark" || p.theme === "light" ? p.theme : DEFAULT_PREFS.theme,
      wrap: typeof p.wrap === "boolean" ? p.wrap : DEFAULT_PREFS.wrap,
      splitMainPct: pct(p.splitMainPct, DEFAULT_PREFS.splitMainPct),
      splitRightPct: pct(p.splitRightPct, DEFAULT_PREFS.splitRightPct),
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Preferences, storage: StorageLike | null = browserStorage()): void {
  const { theme, wrap, splitMainPct, splitRightPct } = prefs;
  try {
    storage?.setItem(PREFS_KEY, JSON.stringify({ theme, wrap, splitMainPct, splitRightPct }));
  } catch {
    // armazenamento indisponível: a página segue com os valores em memória
  }
}
