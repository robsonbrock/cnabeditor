import { describe, expect, it } from "vitest";
import { createValidationRunner, type WorkerOut } from "../../src/workers/validation-runner";
import { L, line, testLayout } from "./fixtures";

function setup(chunkSize = 5000) {
  const out: WorkerOut[] = [];
  const queue: (() => void)[] = [];
  const runner = createValidationRunner(testLayout, (m) => out.push(m), (fn) => queue.push(fn), chunkSize);
  const drain = () => {
    while (queue.length) queue.shift()!();
  };
  return { out, queue, runner, drain };
}

const file = (n: number) => [L.ha(), L.hl(), ...Array.from({ length: n }, (_, i) => L.a(String(i + 1).padStart(5, "0"))), L.tl(String(n + 2).padStart(6, "0"), (10000n * BigInt(n)).toString().padStart(18, "0")), L.ta("000001", String(n + 4).padStart(6, "0"))];

describe("validation worker", () => {
  it("valida em lotes com progress e termina com done", () => {
    const { out, runner, drain } = setup(5000);
    const records = file(12000);
    runner.handle({ type: "validate", jobId: 1, records });
    drain();
    const progress = out.filter((m) => m.type === "progress");
    expect(progress.map((m) => m.type === "progress" && m.processed)).toEqual([5000, 10000, 12004, 12004]);
    expect(progress.every((m) => m.type === "progress" && m.total === 12004 && m.jobId === 1)).toBe(true);
    expect(out.at(-1)).toEqual({ type: "done", jobId: 1, total: 0 });
  });

  it("erros de linha, estrutura e totais vêm nos progress; done traz o total", () => {
    const { out, runner, drain } = setup(2);
    runner.handle({ type: "validate", jobId: 7, records: [L.ha(), L.hl(), line({ 8: "7" }), L.a("0000X"), L.tl("000009"), L.ta()] });
    drain();
    const errors = out.flatMap((m) => (m.type === "progress" ? m.errors : []));
    expect(errors.map((e) => `${e.line}:${e.rule}`).sort()).toEqual(["3:unknownRecord", "4:type", "5:totalMismatch"].sort());
    expect(out.at(-1)).toEqual({ type: "done", jobId: 7, total: 3 });
  });

  it("cancel interrompe o job", () => {
    const { out, runner, queue } = setup(2);
    runner.handle({ type: "validate", jobId: 3, records: file(10) });
    queue.shift()!();
    runner.handle({ type: "cancel", jobId: 3 });
    while (queue.length) queue.shift()!();
    expect(out.some((m) => m.type === "done")).toBe(false);
  });

  it("um novo validate faz o job anterior ser ignorado", () => {
    const { out, runner, drain } = setup(2);
    runner.handle({ type: "validate", jobId: 1, records: file(10) });
    runner.handle({ type: "validate", jobId: 2, records: file(2) });
    drain();
    expect(out.filter((m) => m.type === "done").map((m) => m.jobId)).toEqual([2]);
    expect(out.filter((m) => m.jobId === 1 && m.type === "progress").length).toBeLessThanOrEqual(1);
  });
});
