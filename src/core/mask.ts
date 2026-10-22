import type { FieldDefinition, ValidationError } from "./types";

const VISIBLE = 2;

/** Campos `sensitive` (CPF/CNPJ, agência, conta) mostram só o final em logs (Princípio V). */
export function maskValue(def: FieldDefinition | undefined, value: string): string {
  if (!def?.sensitive) return value;
  if (value.length <= VISIBLE) return "*".repeat(value.length);
  return "*".repeat(value.length - VISIBLE) + value.slice(-VISIBLE);
}

/** Cópia do erro própria para log: valores do campo sensível mascarados, inclusive na mensagem. */
export function maskError(e: ValidationError, def: FieldDefinition | undefined): ValidationError {
  if (!def?.sensitive) return e;
  const hide = (s: string) => (e.found ? s.split(e.found).join(maskValue(def, e.found)) : s);
  return {
    ...e,
    found: maskValue(def, e.found),
    ...(e.expected !== undefined ? { expected: maskValue(def, e.expected) } : {}),
    message: hide(e.message),
  };
}
