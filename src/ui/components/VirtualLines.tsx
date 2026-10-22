import type { JSX } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { FLAG_CHANGED, FLAG_ERROR } from "../../core/types";
import { doc, flagsVersion, selectedIndex } from "../state/document";

export const LINE_HEIGHT = 20;
const OVERSCAN = 10;
/** Viewport assumido quando o ambiente não mede layout (ex.: testes). */
const FALLBACK_VIEWPORT = { width: 1000, height: 600 };
/** Largura fixa da linha fora do texto: padding, rótulo (3ch), gaps, marcador e borda (app.css). */
const fixedWidth = (charWidth: number) => 16 + 3 * charWidth + 16 + 14 + 3;

interface Props {
  wrap: boolean;
  onSelect: (index: number) => void;
  onKeyDown: (e: JSX.TargetedKeyboardEvent<HTMLDivElement>, pageSize: number) => void;
}

function useViewport(ref: { current: HTMLDivElement | null }) {
  const [size, setSize] = useState(FALLBACK_VIEWPORT);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      if (el.clientHeight > 0) setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return size;
}

function useCharWidth(ref: { current: HTMLSpanElement | null }) {
  const [w, setW] = useState(8);
  useLayoutEffect(() => {
    const measured = (ref.current?.getBoundingClientRect().width ?? 0) / 10;
    if (measured > 0) setW(measured);
  }, []);
  return w;
}

/** Primeiro índice i com offsets[i + 1] > y. */
function findIndex(offsets: Float64Array, y: number): number {
  let lo = 0;
  let hi = offsets.length - 2;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid + 1] > y) hi = mid;
    else lo = mid + 1;
  }
  return Math.max(0, lo);
}

/**
 * Quadro principal virtualizado (R9): só linhas visíveis + margem existem no DOM.
 * Com quebra, a altura de cada linha é ceil(len / colunas) × LINE_HEIGHT (fonte monoespaçada).
 */
export function VirtualLines({ wrap, onSelect, onKeyDown }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const viewport = useViewport(scrollRef);
  const charWidth = useCharWidth(probeRef);
  const [scrollTop, setScrollTop] = useState(0);

  const d = doc.value;
  const version = flagsVersion.value;
  const selected = selectedIndex.value;
  const records = d?.records ?? [];
  const cols = Math.max(1, Math.floor((viewport.width - fixedWidth(charWidth)) / charWidth));

  const offsets = useMemo(() => {
    const out = new Float64Array(records.length + 1);
    for (let i = 0; i < records.length; i++) {
      const rows = wrap ? Math.max(1, Math.ceil(records[i].current.length / cols)) : 1;
      out[i + 1] = out[i] + rows * LINE_HEIGHT;
    }
    return out;
    // version: o conteúdo das linhas muda sem trocar o array de registros.
  }, [records, wrap, cols, version]);

  const maxLen = useMemo(() => (wrap ? 0 : records.reduce((m, r) => Math.max(m, r.current.length), 0)), [records, wrap, version]);

  useEffect(() => {
    const el = scrollRef.current;
    if (selected === null || !el || !records.length) return;
    const top = offsets[selected];
    const bottom = offsets[selected + 1];
    const viewTop = el.scrollTop;
    const viewHeight = el.clientHeight || viewport.height;
    if (top < viewTop) el.scrollTop = top;
    else if (bottom > viewTop + viewHeight) el.scrollTop = bottom - viewHeight;
  }, [selected, offsets]);

  const first = records.length ? findIndex(offsets, scrollTop) : 0;
  const last = records.length ? findIndex(offsets, scrollTop + viewport.height) : -1;
  const from = Math.max(0, first - OVERSCAN);
  const to = Math.min(records.length - 1, last + OVERSCAN);
  const pageSize = Math.max(1, Math.floor(viewport.height / LINE_HEIGHT) - 1);

  const rows: JSX.Element[] = [];
  for (let i = from; i <= to; i++) {
    const rec = records[i];
    const flags = d!.flags[i];
    const isSelected = i === selected;
    rows.push(
      <div
        key={i}
        id={`line-${i + 1}`}
        role="option"
        class="line-row"
        data-testid="line-row"
        data-line={i + 1}
        aria-selected={isSelected ? "true" : "false"}
        data-changed={flags & FLAG_CHANGED ? "true" : "false"}
        data-error={flags & FLAG_ERROR ? "true" : "false"}
        style={{ top: `${offsets[i]}px`, height: `${offsets[i + 1] - offsets[i]}px` }}
        onClick={() => onSelect(i)}
      >
        <span class="line-label" data-testid="line-label">
          {rec.label}
        </span>
        <span class="line-text">{rec.current}</span>
        <span class="line-marker">{flags & FLAG_ERROR ? <span class="marker-error" title="Linha com erro(s)" /> : null}</span>
      </div>,
    );
  }

  return (
    <div
      ref={scrollRef}
      class={wrap ? "lines" : "lines nowrap"}
      role="listbox"
      tabIndex={0}
      aria-label="Linhas do arquivo"
      aria-activedescendant={selected !== null ? `line-${selected + 1}` : undefined}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      onKeyDown={(e) => onKeyDown(e, pageSize)}
    >
      <span ref={probeRef} class="line-text" aria-hidden="true" style={{ position: "absolute", visibility: "hidden", whiteSpace: "pre" }}>
        0000000000
      </span>
      <div
        class="lines-inner"
        style={{
          height: `${offsets[records.length]}px`,
          width: wrap ? undefined : `${Math.ceil(maxLen * charWidth + fixedWidth(charWidth))}px`,
        }}
      >
        {rows}
      </div>
    </div>
  );
}
