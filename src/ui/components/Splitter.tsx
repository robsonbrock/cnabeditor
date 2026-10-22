import type { JSX } from "preact";
import { useRef, useState } from "preact/hooks";

const KEY_STEP = 2;

interface Props {
  testId: string;
  /** "vertical": barra vertical que divide esquerda/direita (aria-orientation). */
  orientation: "vertical" | "horizontal";
  /** Porcentagem do contêiner ocupada pelo quadro antes da divisória. */
  value: number;
  /** Mínimos em px dos quadros antes/depois (R11); prevalecem sobre a porcentagem. */
  minBefore: number;
  minAfter: number;
  container: () => HTMLElement | null;
  onChange: (pct: number) => void;
  /** Ao soltar ou por teclado: grava a preferência. */
  onCommit: (pct: number) => void;
  label: string;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Divisória redimensionável por Pointer Events e teclado (FR-029, FR-030). */
export function Splitter({ testId, orientation, value, minBefore, minAfter, container, onChange, onCommit, label }: Props) {
  const [dragging, setDragging] = useState(false);
  const last = useRef(value);
  const vertical = orientation === "vertical";

  const clamp = (pct: number) => {
    const rect = container()?.getBoundingClientRect();
    const total = rect ? (vertical ? rect.width : rect.height) : 0;
    if (total <= 0) return round(Math.min(90, Math.max(10, pct)));
    const lo = (minBefore / total) * 100;
    const hi = 100 - (minAfter / total) * 100;
    return round(lo > hi ? lo : Math.min(hi, Math.max(lo, pct)));
  };

  const fromPointer = (e: PointerEvent) => {
    const rect = container()?.getBoundingClientRect();
    if (!rect) return value;
    const pos = vertical ? e.clientX - rect.left : e.clientY - rect.top;
    const total = vertical ? rect.width : rect.height;
    return clamp((pos / total) * 100);
  };

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    const dir = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 }[e.key];
    const matches = vertical ? e.key === "ArrowLeft" || e.key === "ArrowRight" : e.key === "ArrowUp" || e.key === "ArrowDown";
    if (!dir || !matches) return;
    e.preventDefault();
    const next = clamp(value + dir * KEY_STEP);
    onChange(next);
    onCommit(next);
  };

  return (
    <div
      class={dragging ? "splitter dragging" : "splitter"}
      data-testid={testId}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuenow={value}
      aria-valuemin={10}
      aria-valuemax={90}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!dragging && !e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
        last.current = fromPointer(e);
        onChange(last.current);
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        setDragging(false);
        last.current = fromPointer(e);
        onChange(last.current);
        onCommit(last.current);
      }}
      onKeyDown={onKeyDown}
    />
  );
}
