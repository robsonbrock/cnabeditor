import { signal } from "@preact/signals";
import type { Toast } from "../../core/types";

export const TOAST_DURATION_MS = 5000;

export const toasts = signal<Toast[]>([]);

let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export function dismissToast(id: number): void {
  clearTimeout(timers.get(id));
  timers.delete(id);
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

/** Cada toast tem seu próprio temporizador de 5 s; um não esconde o outro (FR-035/FR-036). */
export function showToast(kind: Toast["kind"], text: string): void {
  const toast: Toast = { id: nextId++, kind, text, createdAt: Date.now(), durationMs: TOAST_DURATION_MS };
  toasts.value = [...toasts.value, toast];
  timers.set(toast.id, setTimeout(() => dismissToast(toast.id), toast.durationMs));
}

export function clearToasts(): void {
  for (const id of timers.keys()) clearTimeout(timers.get(id));
  timers.clear();
  toasts.value = [];
}
