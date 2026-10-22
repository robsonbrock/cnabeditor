import { toasts } from "../state/toasts";

const ICON = { success: "✓", error: "✕" } as const;

export function Toasts() {
  return (
    <div class="toast-region" data-testid="toast-region" aria-live="polite" style={{ pointerEvents: "none" }}>
      {toasts.value.map((t) => (
        <div
          key={t.id}
          class={`toast toast-${t.kind}`}
          data-testid="toast"
          data-kind={t.kind}
          role={t.kind === "error" ? "alert" : "status"}
          style={{ pointerEvents: "auto" }}
        >
          <span class="toast-icon" aria-hidden="true">
            {ICON[t.kind]}
          </span>
          <span class="toast-text">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
