import type { JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { filledCount } from "../../core/fields";
import type { FieldView } from "../../core/types";
import { blurField, session, setFocused, setValue } from "../state/editSession";
import { focusRequest } from "../state/validation";

/** "19–32": posições 1-based do manual. */
export const formatPos = (start: number, end: number) => `${start}–${end}`;

/**
 * Bloqueia inserção além do tamanho (FR-017): só a parte que cabe é inserida; o que já existe nunca é cortado.
 */
function limitInsert(e: JSX.TargetedInputEvent<HTMLInputElement>, size: number, onChange: (v: string) => void) {
  const el = e.currentTarget;
  const data = (e as unknown as InputEvent).data;
  const inputType = (e as unknown as InputEvent).inputType ?? "";
  if (!data || !inputType.startsWith("insert")) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const room = size - (el.value.length - (end - start));
  if (data.length <= room) return;
  e.preventDefault();
  if (room <= 0) return;
  const next = el.value.slice(0, start) + data.slice(0, room) + el.value.slice(end);
  el.value = next;
  el.setSelectionRange(start + room, start + room);
  onChange(next);
}

export function FieldInput({ view, first }: { view: FieldView; first?: boolean }) {
  const s = session.value!;
  const { def } = view;
  const value = s.values[def.id] ?? "";
  const errors = s.fieldErrors[def.id] ?? [];
  const inputId = `field-${def.id}`;
  const errorId = `${inputId}-error`;
  const ref = useRef<HTMLInputElement>(null);

  const request = focusRequest.value;
  useEffect(() => {
    if (request && request.line === s.recordIndex + 1 && (request.fieldId ? request.fieldId === def.id : first)) {
      ref.current?.focus();
      ref.current?.scrollIntoView?.({ block: "nearest" });
      focusRequest.value = null;
    }
  }, [request, s.recordIndex]);

  return (
    <div
      class={["field", s.focusedFieldId === def.id && "focused", errors.length && "invalid"].filter(Boolean).join(" ")}
      data-testid="field"
      data-field-id={def.id}
    >
      <span class="field-pos" data-testid="field-pos">
        {formatPos(def.start, def.end)}
      </span>
      <label class="field-name" data-testid="field-name" for={inputId} title={def.name}>
        {def.name}
      </label>
      <input
        ref={ref}
        id={inputId}
        data-testid="input"
        type="text"
        spellcheck={false}
        autocomplete="off"
        maxLength={def.size}
        value={value}
        aria-invalid={errors.length ? "true" : undefined}
        aria-describedby={errors.length ? errorId : undefined}
        onBeforeInput={(e) => limitInsert(e, def.size, (v) => setValue(def.id, v))}
        onInput={(e) => setValue(def.id, e.currentTarget.value)}
        onFocus={() => setFocused(def.id)}
        onBlur={() => blurField(def.id)}
      />
      <span class="field-counter" data-testid="field-counter">
        {`${filledCount(def, value)}/${def.size}`}
      </span>
      {errors.length > 0 && (
        <div class="field-error" id={errorId} data-testid="field-error" role="alert">
          {errors[0].message}
        </div>
      )}
    </div>
  );
}
