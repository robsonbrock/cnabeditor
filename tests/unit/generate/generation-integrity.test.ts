import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { requiresFor } from "../../../src/core/generate/catalog";
import { STRATEGIES } from "../../../src/core/generate/strategies";
import type { StrategyRef } from "../../../src/core/types";
import { loadLayoutFromDir } from "../../../src/layouts/node-loader";

const layout = loadLayoutFromDir(join(import.meta.dirname, "../../../src/layouts/febraban-cnab240-v10.11"));
const gen = layout.generation!;
const byId = new Map(layout.records.map((r) => [r.id, r]));
const variants = gen.groups.flatMap((g) => g.variants.map((v) => ({ group: g, variant: v })));
const strategyNames = (ref: StrategyRef) => (typeof ref === "string" ? [ref] : Object.values(ref));

describe("generation.json × layout (Princípio I)", () => {
  it("existe e é anexado ao layout", () => {
    expect(gen).toBeDefined();
    expect(gen.groups.length).toBeGreaterThan(0);
  });

  it("todo header de grupo é um Header de Lote do layout, sem repetição", () => {
    const headers = gen.groups.map((g) => g.header);
    expect(new Set(headers).size).toBe(headers.length);
    for (const h of headers) expect(byId.get(h)?.kind, h).toBe("batchHeader");
  });

  it("toda variação é um detalhe do layout, única, com ids de lote e campos existentes", () => {
    const ids = variants.map(({ variant }) => variant.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { group, variant } of variants) {
      const def = byId.get(variant.id);
      expect(def?.kind, variant.id).toBe("detail");
      const header = byId.get(group.header)!;
      for (const fieldId of Object.keys(variant.batch.values)) {
        expect(header.fields.some((f) => f.id === fieldId), `${group.header}.${fieldId}`).toBe(true);
      }
      for (const fieldId of Object.keys(variant.fixed ?? {})) {
        expect(def!.fields.some((f) => f.id === fieldId), `${variant.id}.${fieldId}`).toBe(true);
      }
      for (const id of variant.batch.initial ?? []) expect(byId.get(id)?.kind, id).toBe("batchInitial");
      for (const id of variant.batch.final ?? []) expect(byId.get(id)?.kind, id).toBe("batchFinal");
    }
  });

  it("requires aponta, em cada direção, para variação do mesmo grupo que existe nessa direção e não depende de outra", () => {
    for (const { group, variant } of variants) {
      for (const direction of variant.directions) {
        const id = requiresFor(variant, direction);
        if (!id) continue;
        const principal = group.variants.find((v) => v.id === id);
        expect(principal, `${variant.id} → ${id} (${direction})`).toBeDefined();
        expect(principal!.directions, `${id} em ${direction}`).toContain(direction);
        expect(requiresFor(principal!, direction), id).toBeUndefined();
      }
    }
  });

  it("toda definição tem o campo bankFieldId", () => {
    for (const def of layout.records) expect(def.fields.some((f) => f.id === gen.bankFieldId), def.id).toBe(true);
  });

  it("company.records só cita campos existentes", () => {
    for (const [recordId, fieldIds] of Object.entries(gen.company.records)) {
      const def = byId.get(recordId);
      expect(def, recordId).toBeDefined();
      for (const id of fieldIds) expect(def!.fields.some((f) => f.id === id), `${recordId}.${id}`).toBe(true);
    }
  });

  it("todo campo \"Agência Mantenedora da Conta\" de detalhe ou trailer de lote é da empresa (FR-025)", () => {
    for (const def of layout.records) {
      if (def.kind !== "detail" && def.kind !== "batchTrailer") continue;
      for (const f of def.fields) {
        if (f.name !== "Agência Mantenedora da Conta") continue;
        expect(gen.company.records[def.id] ?? [], `${def.id}.${f.id}`).toContain(f.id);
      }
    }
  });

  it("nenhum campo de terceiro (favorecido, pagador, beneficiário) é da empresa (FR-026)", () => {
    for (const [recordId, fieldIds] of Object.entries(gen.company.records)) {
      const def = byId.get(recordId)!;
      for (const id of fieldIds) {
        const name = def.fields.find((f) => f.id === id)!.name;
        expect(name, `${recordId}.${id}`).not.toMatch(/Favor|Pagador|Benef/);
      }
    }
  });

  it("toda chave de strategies é uma nota existente no layout e toda estratégia existe", () => {
    const refs = new Set(layout.records.flatMap((r) => r.fields.map((f) => f.reference)));
    for (const [ref, strategy] of Object.entries(gen.strategies)) {
      expect(refs.has(ref), ref).toBe(true);
      for (const name of strategyNames(strategy)) expect(STRATEGIES[name], name).toBeDefined();
    }
    for (const [key, strategy] of Object.entries(gen.fieldStrategies ?? {})) {
      const [recordId, fieldId] = key.split(".");
      expect(byId.get(recordId)?.fields.some((f) => f.id === fieldId), key).toBe(true);
      for (const name of strategyNames(strategy)) expect(STRATEGIES[name], name).toBeDefined();
    }
  });

  it("fixed de nível superior cita campos existentes", () => {
    for (const key of Object.keys(gen.fixed ?? {})) {
      const [recordId, fieldId] = key.split(".");
      expect(byId.get(recordId)?.fields.some((f) => f.id === fieldId), key).toBe(true);
    }
  });

  it("os nomes exibidos (títulos sem \"Detalhe – \") são únicos dentro de cada grupo", () => {
    for (const g of gen.groups) {
      const names = g.variants.map((v) => byId.get(v.id)!.title.replace(/^Detalhe – /, ""));
      expect(new Set(names).size, g.header).toBe(names.length);
    }
  });

  it("todo detalhe do layout está no catálogo ou em excluded com motivo, nunca nos dois (FR-003)", () => {
    const inCatalog = new Set(variants.map(({ variant }) => variant.id));
    const excluded = new Map((gen.excluded ?? []).map((e) => [e.id, e.reason]));
    for (const [id, reason] of excluded) {
      expect(reason.trim().length, id).toBeGreaterThan(0);
      expect(inCatalog.has(id), id).toBe(false);
    }
    for (const def of layout.records.filter((r) => r.kind === "detail")) {
      expect(inCatalog.has(def.id) || excluded.has(def.id), def.id).toBe(true);
    }
  });
});
