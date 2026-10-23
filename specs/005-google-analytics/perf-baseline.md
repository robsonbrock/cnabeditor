# Base de desempenho antes da medição (T003, SC-004)

Medida em 2026-10-23, antes de qualquer instrumentação, com o build `--mode e2e` do commit `58a094b` servido por `vite preview`.

Comando: `npx playwright test --grep @perf --project=chromium --reporter=json`, 3 execuções. O `perf.spec.ts` não imprime tempos parciais, então o valor é a duração total de cada teste no relatório do Playwright: inclui abrir, validar, rolar, editar e, nos de massa, gerar.

| Teste (`tests/e2e/perf.spec.ts`) | Mediana (ms) | Execuções (ms) |
|---|---:|---|
| SC-005: 10.000 linhas carregadas e exibidas | 2555 | 2505, 2555, 3743 |
| SC-005/SC-005a/SC-004: 100.000 linhas, rolar, selecionar e editar | 7396 | 7375, 7396, 8295 |
| SC-003: massa de 10.000 linhas no quadro | 3807 | 3547, 3807, 4544 |
| SC-003: massa de ~100.000 linhas no quadro | 9064 | 8374, 9064, 9134 |

Limite do SC-004: cada mediana pode subir no máximo 5% depois da instrumentação (T029).

## Comparação depois da instrumentação (T029)

A primeira rodada pós-instrumentação (3 execuções seguidas) saiu de 37% a 123% mais lenta, e o teste de massa de 100.000 linhas estourou os 15 s nas 3 execuções. Como a instrumentação só faz alguns `push` por ação, e nenhum por linha, a comparação foi refeita alternando, na mesma rodada, o build da base (guardado antes da instrumentação) e o build novo, ambos em `--mode e2e`:

| Teste | Base (mediana, ms) | Com medição (mediana, ms) | Diferença |
|---|---:|---:|---:|
| 10.000 linhas carregadas e exibidas | 3207 | 3222 | +0,5% |
| 100.000 linhas, rolar, selecionar e editar | 11209 | 11682 | +4,2% |
| massa de 10.000 linhas | 4586 | 4236 | −7,6% |
| massa de ~100.000 linhas | 12749 | 13345 | +4,7% |

Execuções da base: 3128/3207/3932; 8586/11209/12316; 4486/4586/4849; 9956/12749/15523. Execuções com medição: 2886/3222/4013; 11029/11682/14040; 3844/4236/5909; 10992/13345/17127.

Nesta rodada a própria base ficou de 25% a 50% mais lenta que na medição da manhã: a máquina estava instável. As medianas ficaram dentro dos 5% do SC-004. Mesmo assim, a massa de ~100.000 linhas passou dos 15 s em 1 das 3 execuções com medição, e a base chegou a 15,5 s na mesma rodada. Convém repetir a medição numa máquina estável antes de considerar o SC-004 fechado.
