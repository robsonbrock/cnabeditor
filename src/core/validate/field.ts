import type { FieldDefinition, LayoutDefinition, Trigger, ValidationError, ValidationRule } from "../types";

const DIGITS = /^[0-9]*$/;
const ZEROS = /^0+$/;
const BLANK = /^ *$/;
/** Conjunto FEBRABAN recomendado para alfanuméricos: maiúsculas sem acento, dígitos, espaço e pontuação básica. */
const FEBRABAN_CHAR = /[A-Z0-9 .,;:\-/()&*@'"+=?!#$%_]/;

const isNumeric = (def: FieldDefinition) => def.type !== "A";

/** Valor como "Atualizar linha" o gravaria (R7): N/V/D/H com zeros à esquerda, A com espaços à direita. */
export function padValue(def: FieldDefinition, value: string): string {
  return isNumeric(def) ? value.padStart(def.size, "0") : value.padEnd(def.size, " ");
}

function validDate(v: string): boolean {
  const d = Number(v.slice(0, 2));
  const m = Number(v.slice(2, 4));
  const y = Number(v.slice(4, 8));
  if (m < 1 || m > 12 || d < 1 || y < 1) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= days;
}

function validTime(v: string): boolean {
  return Number(v.slice(0, 2)) <= 23 && Number(v.slice(2, 4)) <= 59 && Number(v.slice(4, 6)) <= 59;
}

function domainValues(def: FieldDefinition, layout: LayoutDefinition) {
  if (!def.domain) return null;
  return Array.isArray(def.domain) ? def.domain : (layout.domains[def.domain.ref] ?? []);
}

/**
 * Regras do campo (FR-015/FR-015b, data-model §4). "input": só length e type (a cada tecla);
 * "blur": todas, sobre o valor como seria gravado. Nada é corrigido, só reportado (Princípio III).
 */
export function validateField(
  def: FieldDefinition,
  value: string,
  trigger: Trigger,
  layout: LayoutDefinition,
  line = 0,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const add = (rule: ValidationRule, message: string) =>
    errors.push({ line, start: def.start, end: def.end, fieldId: def.id, fieldName: def.name, found: value, rule, message, trigger });

  if (value.length > def.size) add("length", `Tamanho excedido: o campo aceita no máximo ${def.size} caracteres`);
  if (isNumeric(def) && !DIGITS.test(value)) add("type", "Caractere inválido: o campo aceita apenas dígitos (0–9)");
  if (trigger === "input" || errors.length) return errors;

  const padded = padValue(def, value);
  const blank = isNumeric(def) ? value === "" : BLANK.test(value);
  if (def.required && blank) add("required", "Campo obrigatório: preencha este campo");

  const optionalEmpty = !def.required && (BLANK.test(padded) || (isNumeric(def) && ZEROS.test(padded)));
  const domain = domainValues(def, layout);
  if (domain && !optionalEmpty && !domain.some((o) => o.code === padded)) {
    add("domain", `Opção inválida: "${value}" não é um valor permitido para este campo`);
  }
  if (def.type === "D" && !(optionalEmpty && ZEROS.test(padded)) && !validDate(padded)) {
    add("date", `Data inválida: "${value}" não é uma data DDMMAAAA válida`);
  }
  if (def.type === "H" && !validTime(padded)) add("time", `Hora inválida: "${value}" não é uma hora HHMMSS válida`);
  if (def.type === "A") {
    const bad = [...value].find((c) => !FEBRABAN_CHAR.test(c));
    if (bad !== undefined) {
      add("charset", `Caractere fora do padrão FEBRABAN: "${bad}" (use maiúsculas sem acento, dígitos, espaço e pontuação básica)`);
    }
  }
  return errors;
}
