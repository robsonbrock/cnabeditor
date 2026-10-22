import { fireEvent, render, screen } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { Splitter } from "../../src/ui/components/Splitter";

function setup(props: Partial<Parameters<typeof Splitter>[0]> = {}) {
  const onChange = vi.fn();
  const onCommit = vi.fn();
  const container = document.createElement("div");
  container.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 800, right: 1000, bottom: 800, x: 0, y: 0, toJSON: () => ({}) });
  render(
    <Splitter
      testId="split-main"
      orientation="vertical"
      value={55}
      minBefore={320}
      minAfter={360}
      container={() => container}
      onChange={onChange}
      onCommit={onCommit}
      label="Redimensionar"
      {...props}
    />,
  );
  return { el: screen.getByTestId("split-main"), onChange, onCommit };
}

describe("Splitter", () => {
  it("role separator com aria-valuenow e orientação", () => {
    const { el } = setup();
    expect(el.getAttribute("role")).toBe("separator");
    expect(el.getAttribute("aria-valuenow")).toBe("55");
    expect(el.getAttribute("aria-orientation")).toBe("vertical");
    expect(el.tabIndex).toBe(0);
  });

  it("arrastar altera a porcentagem e só grava ao soltar", () => {
    const { el, onChange, onCommit } = setup();
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 550, button: 0 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 400 });
    expect(onChange).toHaveBeenLastCalledWith(40);
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(el, { pointerId: 1, clientX: 400 });
    expect(onCommit).toHaveBeenCalledWith(40);
  });

  it("mínimos em px prevalecem ao arrastar", () => {
    const { el, onChange } = setup();
    fireEvent.pointerDown(el, { pointerId: 1, clientX: 550, button: 0 });
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 100 });
    expect(onChange).toHaveBeenLastCalledWith(32); // 320 px de 1000
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 900 });
    expect(onChange).toHaveBeenLastCalledWith(64); // 1000 - 360 px
  });

  it("setas movem 2% e gravam", () => {
    const { el, onChange, onCommit } = setup();
    fireEvent.keyDown(el, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith(53);
    expect(onCommit).toHaveBeenLastCalledWith(53);
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(onCommit).toHaveBeenLastCalledWith(57);
  });

  it("horizontal: ↑/↓ e clientY", () => {
    const onCommit = vi.fn();
    const { el } = setup({ testId: "split-main", orientation: "horizontal", minBefore: 160, minAfter: 120, onCommit });
    fireEvent.keyDown(el, { key: "ArrowDown" });
    expect(onCommit).toHaveBeenLastCalledWith(57);
    fireEvent.pointerDown(el, { pointerId: 1, clientY: 440, button: 0 });
    fireEvent.pointerUp(el, { pointerId: 1, clientY: 400 });
    expect(onCommit).toHaveBeenLastCalledWith(50);
  });
});
