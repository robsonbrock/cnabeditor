import { definitionOf } from "./resolve";
import { padValue } from "./validate/field";
import type { AllowedValue, CnabRecord, FieldDefinition, FieldView, LayoutDefinition } from "./types";

const LEADING_ZEROS = /^0+/;
const TRAILING_SPACES = / +$/;

/** Campo sintético para registros não reconhecidos (FR-023): a linha inteira, preservada. */
export function rawField(length: number): FieldDefinition {
  return {
    id: "conteudoBruto",
    name: "Conteúdo bruto",
    start: 1,
    end: length,
    size: length,
    type: "A",
    required: false,
    description: "Registro não reconhecido pelo layout. O conteúdo é exibido e preservado intacto, como um único campo.",
  };
}

/** Contador "preenchido" (R7): N/V/D/H sem zeros à esquerda; A sem espaços à direita. */
export function filledCount(def: FieldDefinition, value: string): number {
  return def.type === "A" ? value.replace(TRAILING_SPACES, "").length : value.replace(LEADING_ZEROS, "").length;
}

/** Campos da definição do registro; linha curta ⇒ só os campos que começam dentro da linha. */
export function fieldsOf(record: CnabRecord, layout: LayoutDefinition): FieldDefinition[] {
  const def = definitionOf(layout, record.definitionId);
  if (!def) return [rawField(record.current.length)];
  return def.fields.filter((f) => f.start <= record.current.length);
}

/** Fatia o conteúdo atual pelos campos da definição (contracts/core-api.md). */
export function sliceFields(record: CnabRecord, layout: LayoutDefinition): FieldView[] {
  return fieldsOf(record, layout).map((def) => {
    const value = record.current.slice(def.start - 1, def.end);
    return { def, value, filled: filledCount(def, value) };
  });
}

/** Opções do campo codificado com destaque do valor atual (FR-014). match = null ⇒ valor sem correspondência. */
export function describeDomain(
  def: FieldDefinition,
  value: string,
  layout: LayoutDefinition,
): { options: AllowedValue[]; match: AllowedValue | null } | null {
  if (!def.domain) return null;
  const options = Array.isArray(def.domain) ? def.domain : (layout.domains[def.domain.ref] ?? []);
  return { options, match: options.find((o) => o.code === value) ?? null };
}

/**
 * Reescreve a linha a partir dos valores editados (FR-018/FR-019). Campos com value === baseline
 * reaproveitam o trecho original sem padding; os demais recebem o preenchimento do tipo. Nunca trunca.
 */
export function applyEdits(
  current: string,
  fields: FieldDefinition[],
  values: Record<string, string>,
  baseline: Record<string, string>,
): string {
  let line = current;
  for (const def of fields) {
    const value = values[def.id];
    if (value === undefined || value === baseline[def.id]) continue;
    if (value.length > def.size) throw new Error(`Valor maior que o campo ${def.id} (${value.length} > ${def.size})`);
    line = line.slice(0, def.start - 1) + padValue(def, value) + line.slice(def.end);
  }
  return line;
}
