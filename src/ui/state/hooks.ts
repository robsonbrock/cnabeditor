import type { CnabDocument } from "../../core/types";

/**
 * Ganchos entre módulos de estado, preenchidos por editSession.ts e validation.ts.
 * Evitam importação circular com document.ts.
 */
export const hooks = {
  onSelect: (_index: number | null): void => {},
  onDocumentLoaded: (_doc: CnabDocument): void => {},
  /** Conteúdo de linhas mudou (Atualizar linha, Recalcular totais): revalidar. */
  onContentChanged: (): void => {},
  isDirty: (): boolean => false,
};
