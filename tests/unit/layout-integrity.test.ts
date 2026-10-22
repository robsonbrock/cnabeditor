import { describe, expect, it } from "vitest";
import { febrabanCnab240 as layout } from "../../src/layouts/loader";
import type { MatchRule, RecordDefinition } from "../../src/core/types";

// x-semantic-rules de contracts/layout-definition.schema.json.

const fieldIds = (rec: RecordDefinition) => new Set(rec.fields.map((f) => f.id));

/** Duas condições de posição (mesmo intervalo ou intervalos sobrepostos) podem ser satisfeitas ao mesmo tempo? */
function posCompatible(a: Extract<MatchRule, { pos: unknown }>, b: Extract<MatchRule, { pos: unknown }>): boolean {
  const lo = Math.max(a.pos[0], b.pos[0]);
  const hi = Math.min(a.pos[1], b.pos[1]);
  if (lo > hi) return true;
  const values = (r: typeof a) => ("equals" in r ? [r.equals] : r.in);
  const slice = (r: typeof a, v: string) => v.slice(lo - r.pos[0], hi - r.pos[0] + 1);
  const sa = new Set(values(a).map((v) => slice(a, v)));
  return values(b).some((v) => sa.has(slice(b, v)));
}

function compatible(x: RecordDefinition, y: RecordDefinition): boolean {
  for (const a of x.match) {
    for (const b of y.match) {
      if ("pos" in a && "pos" in b && !posCompatible(a, b)) return false;
      if ("batch" in a && "batch" in b && a.batch === b.batch && !a.in.some((v) => b.in.includes(v))) return false;
    }
  }
  return true;
}

describe("integridade do layout FEBRABAN CNAB 240 v10.11", () => {
  it("tem metadados e ao menos um registro", () => {
    expect(layout.id).toBe("febraban-cnab240-v10.11");
    expect(layout.recordLength).toBe(240);
    expect(layout.records.length).toBeGreaterThan(0);
  });

  it("ids de registro são únicos no layout", () => {
    const ids = layout.records.map((r) => r.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  for (const rec of layout.records) {
    describe(rec.id, () => {
      it("ids de campo são únicos no registro", () => {
        const ids = rec.fields.map((f) => f.id);
        expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
      });

      it("end >= start, end <= recordLength e size = end - start + 1", () => {
        for (const f of rec.fields) {
          expect(f.end, f.id).toBeGreaterThanOrEqual(f.start);
          expect(f.end, f.id).toBeLessThanOrEqual(layout.recordLength);
          expect(f.size, f.id).toBe(f.end - f.start + 1);
        }
      });

      it("campos ordenados por start cobrem 1..recordLength sem buracos nem sobreposições", () => {
        let next = 1;
        for (const f of rec.fields) {
          expect(f.start, `${f.id} deveria começar em ${next}`).toBe(next);
          next = f.end + 1;
        }
        expect(next - 1).toBe(layout.recordLength);
      });

      it("campo V tem decimals; decimals só em V", () => {
        for (const f of rec.fields) {
          if (f.type === "V") expect(f.decimals, f.id).toBeGreaterThanOrEqual(0);
          else expect(f.decimals, f.id).toBeUndefined();
        }
      });

      it("domain.ref existe e todo AllowedValue.code tem o tamanho do campo", () => {
        for (const f of rec.fields) {
          if (!f.domain) continue;
          const values = Array.isArray(f.domain) ? f.domain : layout.domains[f.domain.ref];
          expect(values, `${f.id}: domínio inexistente`).toBeDefined();
          for (const v of values) expect(v.code.length, `${f.id} código "${v.code}"`).toBe(f.size);
        }
      });

      it("totals referenciam campos e registros existentes", () => {
        for (const t of rec.totals ?? []) {
          expect(fieldIds(rec).has(t.field), t.field).toBe(true);
          if (t.kind === "sum") {
            expect(t.source).toBeDefined();
            for (const id of t.source!.records) {
              const src = layout.records.find((r) => r.id === id);
              expect(src, `registro ${id}`).toBeDefined();
              expect(fieldIds(src!).has(t.source!.field), `${id}.${t.source!.field}`).toBe(true);
            }
          }
        }
      });

      it("match lê só posições dentro do registro", () => {
        for (const m of rec.match) {
          if ("pos" in m) {
            expect(m.pos[0]).toBeGreaterThanOrEqual(1);
            expect(m.pos[1]).toBeLessThanOrEqual(layout.recordLength);
            for (const v of "equals" in m ? [m.equals] : m.in) expect(v.length).toBe(m.pos[1] - m.pos[0] + 1);
          }
        }
      });
    });
  }

  it("sem ambiguidade: definições do mesmo kind com o mesmo número de condições não se sobrepõem", () => {
    const ambiguous: string[] = [];
    const recs = layout.records;
    for (let i = 0; i < recs.length; i++) {
      for (let j = i + 1; j < recs.length; j++) {
        const [a, b] = [recs[i], recs[j]];
        if (a.kind === b.kind && a.match.length === b.match.length && compatible(a, b)) ambiguous.push(`${a.id} × ${b.id}`);
      }
    }
    expect(ambiguous).toEqual([]);
  });
});
