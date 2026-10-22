import { computed, signal } from "@preact/signals";
import { detectDirectionWith } from "../../core/document";
import { applyEdits, sliceFields } from "../../core/fields";
import { resolveAround } from "../../core/resolve";
import { FLAG_CHANGED, FLAG_ERROR, type EditSession, type FieldView, type ValidationError } from "../../core/types";
import { validateField } from "../../core/validate/field";
import { validateRecord } from "../../core/validate/record";
import { doc, layout, touchLines } from "./document";
import { hooks } from "./hooks";
import { showToast } from "./toasts";

export const session = signal<EditSession | null>(null);
/** Campos exibidos no quadro de edição para a linha selecionada. */
export const sessionFields = signal<FieldView[]>([]);

export const isDirty = computed(() => {
  const s = session.value;
  return !!s && Object.keys(s.values).some((id) => s.values[id] !== s.baseline[id]);
});

const INPUT_RULES = new Set(["length", "type"]);

const viewOf = (fieldId: string) => sessionFields.value.find((v) => v.def.id === fieldId);

/** Erros de todas as regras para os valores carregados; campos cortados por linha curta ficam de fora (já há lineLength). */
function blurErrors(views: FieldView[], line: number): Record<string, ValidationError[]> {
  const out: Record<string, ValidationError[]> = {};
  for (const { def, value } of views) {
    if (value.length < def.size) continue;
    const errors = validateField(def, value, "blur", layout.value, line);
    if (errors.length) out[def.id] = errors;
  }
  return out;
}

/** Carrega os campos da linha; baseline = trecho atual da linha no quadro principal. */
export function openSession(index: number | null, keepFocus: string | null = null): void {
  const d = doc.value;
  if (index === null || !d || !d.records[index]) {
    session.value = null;
    sessionFields.value = [];
    return;
  }
  const views = sliceFields(d.records[index], layout.value);
  const baseline = Object.fromEntries(views.map((v) => [v.def.id, v.value]));
  sessionFields.value = views;
  session.value = {
    recordIndex: index,
    values: { ...baseline },
    baseline,
    fieldErrors: blurErrors(views, index + 1),
    focusedFieldId: keepFocus && baseline[keepFocus] !== undefined ? keepFocus : null,
  };
}

/** A cada tecla: só tamanho e tipo (FR-015); erros de domínio/data ficam até a próxima saída do campo (FR-015b). */
export function setValue(fieldId: string, value: string): void {
  const s = session.value;
  const view = viewOf(fieldId);
  if (!s || !view) return;
  const kept = (s.fieldErrors[fieldId] ?? []).filter((e) => !INPUT_RULES.has(e.rule));
  const errors = [...validateField(view.def, value, "input", layout.value, s.recordIndex + 1), ...kept];
  session.value = { ...s, values: { ...s.values, [fieldId]: value }, fieldErrors: { ...s.fieldErrors, [fieldId]: errors } };
}

/** Ao sair do campo: todas as regras são reavaliadas (FR-015b). */
export function blurField(fieldId: string): void {
  const s = session.value;
  const view = viewOf(fieldId);
  if (!s || !view) return;
  const value = s.values[fieldId] ?? "";
  const unchangedShort = value === s.baseline[fieldId] && value.length < view.def.size;
  const errors = unchangedShort ? [] : validateField(view.def, value, "blur", layout.value, s.recordIndex + 1);
  session.value = { ...s, fieldErrors: { ...s.fieldErrors, [fieldId]: errors } };
}

export function setFocused(fieldId: string | null): void {
  const s = session.value;
  if (s && s.focusedFieldId !== fieldId) session.value = { ...s, focusedFieldId: fieldId };
}

/** "Descartar" (FR-022a): volta aos valores atuais da linha no quadro principal. */
export function discard(): void {
  const s = session.value;
  if (!s) return;
  openSession(s.recordIndex, s.focusedFieldId);
}

/**
 * "Atualizar linha" (FR-018/FR-019): reescreve só os campos editados; a validação informa sem bloquear (FR-020).
 */
export function updateLine(): void {
  const s = session.value;
  const d = doc.value;
  if (!s || !d) return;
  const rec = d.records[s.recordIndex];
  rec.current = applyEdits(rec.current, sessionFields.value.map((v) => v.def), s.values, s.baseline);
  // Tipo de registro, segmento ou contexto de lote podem ter mudado.
  resolveAround(d.records, layout.value, s.recordIndex);
  d.direction = detectDirectionWith(d, layout.value);
  d.flags[s.recordIndex] = rec.current !== rec.original ? d.flags[s.recordIndex] | FLAG_CHANGED : d.flags[s.recordIndex] & ~FLAG_CHANGED;
  const errors = validateRecord(rec, layout.value);
  d.flags[s.recordIndex] = errors.length ? d.flags[s.recordIndex] | FLAG_ERROR : d.flags[s.recordIndex] & ~FLAG_ERROR;
  d.hasUnexportedChanges = true;
  doc.value = { ...d };
  touchLines();
  openSession(s.recordIndex, s.focusedFieldId);

  const line = s.recordIndex + 1;
  const badFields = new Set(errors.filter((e) => e.fieldId).map((e) => e.fieldId)).size;
  showToast("success", badFields ? `Linha ${line} atualizada com ${badFields} campo(s) com erro` : `Linha ${line} atualizada`);
  hooks.onContentChanged();
}

hooks.onSelect = (index) => openSession(index);
hooks.isDirty = () => isDirty.value;
