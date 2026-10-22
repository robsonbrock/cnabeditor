// Gera arquivos fictícios válidos de 10.000 e 100.000 linhas para tests/e2e/perf.spec.ts.
// Saída em tests/e2e/fixtures/ (ignorada pelo git). Uso: npm run generate:perf
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(import.meta.dirname, "..", "tests", "e2e", "fixtures");

/** Linha de 240 posições com valores nas posições 1-based indicadas (layout FEBRABAN, Pagamentos). */
function line(values: Record<number, string>): string {
  const chars = Array.from({ length: 240 }, () => " ");
  for (const [pos, v] of Object.entries(values)) [...v].forEach((c, i) => (chars[Number(pos) - 1 + i] = c));
  return chars.join("");
}
const num = (n: number | bigint, size: number) => n.toString().padStart(size, "0");

/** HA + um lote de crédito (Segmentos A) + TL + TA: `total` linhas no arquivo. */
export function buildPerfFile(total: number): string {
  const details = total - 4;
  const lines: string[] = [];
  lines.push(line({ 1: "999", 4: "0000", 8: "0", 18: "2", 19: "11222333000181", 53: "01234", 59: "000000567890", 71: "1", 73: "EMPRESA FICTICIA TESTES LTDA", 103: "BANCO FICTICIO S.A.", 143: "1", 144: "22102026", 152: "115207", 158: "000001", 164: "103", 167: "00000" }));
  lines.push(line({ 1: "999", 4: "0001", 8: "1", 9: "C", 10: "20", 12: "01", 14: "046", 18: "2", 19: "11222333000181", 53: "01234", 59: "000000567890", 71: "1", 73: "EMPRESA FICTICIA TESTES LTDA", 173: "00000", 213: "00000", 223: "00" }));
  let sum = 0n;
  for (let i = 1; i <= details; i++) {
    const valor = BigInt(1000 + (i % 97));
    sum += valor;
    lines.push(
      line({
        1: "999", 4: "0001", 8: "3", 9: num(i % 100000, 5), 14: "A", 15: "0", 16: "00", 18: "000", 21: "999", 24: "04321", 30: "000000123456", 42: "7",
        44: `FAVORECIDO FICTICIO ${num(i, 6)}`, 74: `PGTO${num(i, 8)}`, 94: "23102026", 102: "BRL", 105: num(0, 15), 120: num(valor, 15),
        155: "00000000", 163: num(0, 15), 230: "0",
      }),
    );
  }
  lines.push(line({ 1: "999", 4: "0001", 8: "5", 18: num(details + 2, 6), 24: num(sum, 18), 42: num(0, 18), 60: num(0, 6) }));
  lines.push(line({ 1: "999", 4: "9999", 8: "9", 18: num(1, 6), 24: num(total, 6), 30: num(0, 6) }));
  return lines.join("\r\n") + "\r\n";
}

if (process.argv[1]?.endsWith("generate-perf-files.ts")) {
  mkdirSync(outDir, { recursive: true });
  for (const n of [10_000, 100_000]) {
    writeFileSync(join(outDir, `perf-${n}.rem`), buildPerfFile(n), "latin1");
    console.log(`tests/e2e/fixtures/perf-${n}.rem`);
  }
}
