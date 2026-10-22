import { act, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toasts } from "../../src/ui/components/Toasts";
import { clearToasts, showToast } from "../../src/ui/state/toasts";

describe("Toasts", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    clearToasts();
    vi.useRealTimers();
  });

  it("região aria-live polite que não bloqueia cliques fora do toast", () => {
    render(<Toasts />);
    const region = screen.getByTestId("toast-region");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.style.pointerEvents).toBe("none");
  });

  it("empilha toasts e cada um some sozinho após 5000 ms", () => {
    render(<Toasts />);
    act(() => showToast("success", "Linha 1 atualizada"));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => showToast("error", "Arquivo não exportado: falha"));
    expect(screen.getAllByTestId("toast")).toHaveLength(2);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const left = screen.getAllByTestId("toast");
    expect(left).toHaveLength(1);
    expect(left[0].textContent).toContain("Arquivo não exportado");

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getAllByTestId("toast")).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryAllByTestId("toast")).toHaveLength(0);
  });

  it("sucesso e erro têm data-kind, classe e ícone distintos", () => {
    render(<Toasts />);
    act(() => {
      showToast("success", "ok");
      showToast("error", "falhou");
    });
    const [ok, err] = screen.getAllByTestId("toast");
    expect(ok.dataset.kind).toBe("success");
    expect(err.dataset.kind).toBe("error");
    expect(ok.className).not.toBe(err.className);
    const icon = (t: HTMLElement) => t.querySelector(".toast-icon [data-icon]")!.getAttribute("data-icon");
    expect(icon(ok)).not.toBe(icon(err));
    expect(ok.style.pointerEvents).toBe("auto");
  });
});
