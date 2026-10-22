import type { FieldDefinition, LayoutDefinition, RecordDefinition } from "../core/types";

type RawField = Omit<FieldDefinition, "size">;
type RawRecord = Omit<RecordDefinition, "fields"> & { fields: RawField[] };
export type RawLayoutMeta = Omit<LayoutDefinition, "records"> & { domains?: LayoutDefinition["domains"] };

/** Monta a LayoutDefinition a partir de layout.json + um JSON por RecordDefinition (R5). */
export function assembleLayout(meta: RawLayoutMeta, records: RawRecord[]): LayoutDefinition {
  return {
    ...meta,
    domains: meta.domains ?? {},
    records: records.map((r) => ({
      ...r,
      fields: r.fields
        // Nota G039 (Código de Segmento): todos os segmentos usam a mesma lista de layout.json.
        .map((f) => (f.reference === "G039" && !f.domain && meta.domains?.codigoSegmento ? { ...f, domain: { ref: "codigoSegmento" } } : f))
        .map((f) => ({ ...f, size: f.end - f.start + 1 }))
        .sort((a, b) => a.start - b.start),
    })),
  };
}
