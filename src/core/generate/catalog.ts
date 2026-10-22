import { definitionOf } from "../resolve";
import type { GenerationDirection, LayoutDefinition, VariantMeta } from "../types";

/** Principal de que a variação depende na direção dada. */
export const requiresFor = (v: VariantMeta, direction: GenerationDirection): string | undefined =>
  v.requires === undefined ? undefined : typeof v.requires === "string" ? v.requires : v.requires[direction];

export interface CatalogVariant {
  id: string;
  label: string;
  requires?: string;
  dependents: string[];
}

export interface CatalogGroup {
  header: string;
  label: string;
  variants: CatalogVariant[];
}

const HEADER_PREFIX = /^Header de Lote – /;
const DETAIL_PREFIX = /^Detalhe – /;

/** Nome exibido de uma definição: o título oficial transcrito do manual, sem o prefixo do tipo de registro. */
export function displayName(layout: LayoutDefinition, id: string): string {
  const title = definitionOf(layout, id)?.title ?? id;
  return title.replace(HEADER_PREFIX, "").replace(DETAIL_PREFIX, "");
}

/** Variações selecionáveis para a direção, agrupadas por Header de Lote, na ordem do generation.json. */
export function buildCatalog(layout: LayoutDefinition, direction: GenerationDirection): CatalogGroup[] {
  const groups = layout.generation?.groups ?? [];
  return groups
    .map((g) => {
      const available = g.variants.filter((v) => v.directions.includes(direction));
      const ids = new Set(available.map((v) => v.id));
      return {
        header: g.header,
        label: displayName(layout, g.header),
        variants: available.map((v) => {
          const requires = requiresFor(v, direction);
          return {
            id: v.id,
            label: displayName(layout, v.id),
            ...(requires ? { requires } : {}),
            dependents: available.filter((d) => requiresFor(d, direction) === v.id && ids.has(d.id)).map((d) => d.id),
          };
        }),
      };
    })
    .filter((g) => g.variants.length > 0);
}

/** Variação e o Header de Lote do seu grupo, sem filtro de direção. */
export function findVariant(layout: LayoutDefinition, id: string): { header: string; variant: VariantMeta } | null {
  for (const g of layout.generation?.groups ?? []) {
    const variant = g.variants.find((v) => v.id === id);
    if (variant) return { header: g.header, variant };
  }
  return null;
}
