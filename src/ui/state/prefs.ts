import { signal } from "@preact/signals";
import type { Preferences } from "../../core/types";
import { loadPrefs, savePrefs } from "../prefs";

export const prefs = signal<Preferences>(loadPrefs());

/** Atualiza em memória; `persist` grava (ao soltar a divisória, ao alternar tema ou quebra). */
export function setPrefs(patch: Partial<Preferences>, persist = true): void {
  prefs.value = { ...prefs.value, ...patch };
  if (persist) savePrefs(prefs.value);
}
