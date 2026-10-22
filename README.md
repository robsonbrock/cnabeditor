# CNAB Editor

Editor de página única, sem login e sem backend, para importar ou colar, inspecionar campo a campo, editar com validação em tempo real, recalcular totais e exportar ou copiar arquivos **CNAB 240** (remessa e retorno), conforme o [Layout Padrão FEBRABAN CNAB 240 v10.11](https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf).

Todo o processamento acontece no navegador. O conteúdo dos arquivos nunca é enviado a um servidor nem gravado no navegador; só as preferências de interface ficam no `localStorage`.

## Stack

- TypeScript 5 e Preact 10 com `@preact/signals`, build com Vite 6. A saída é estática, em `dist/`.
- Testes:
  - Vitest para unidade, golden files e componentes (happy-dom).
  - Playwright para E2E em Chromium, Firefox e WebKit.
- O layout é um conjunto de **dados declarativos em JSON** (`src/layouts/febraban-cnab240-v10.11/`). Esses arquivos são validados por JSON Schema (`specs/001-cnab240-editor/contracts/layout-definition.schema.json`), e o motor (`src/core/`) não contém posições de campo.

Decisões e arquitetura: [specs/001-cnab240-editor/plan.md](specs/001-cnab240-editor/plan.md) e [research.md](specs/001-cnab240-editor/research.md).

## Rodando a aplicação

Pré-requisito: Node.js 22 LTS e npm 10+.

```sh
npm install
npx playwright install      # navegadores dos testes E2E

npm run dev                 # servidor de desenvolvimento (http://localhost:5173)
npm run build               # gera dist/ estático
npm run preview             # serve dist/ em http://localhost:4173
```

O conteúdo de `dist/` pode ser publicado em qualquer host de arquivos estáticos. Recomenda-se HTTPS, exigido pela Clipboard API.

## Testes

```sh
npm run test             # Vitest: core, golden files, integridade do layout, componentes
npm run test:golden      # só golden files: parse, round-trip byte a byte, validação, recálculo
npm run test:e2e         # Playwright: cenários de aceitação nos 3 navegadores
npm run test:perf        # Playwright (Chromium): 10.000 e 100.000 linhas
npm run lint             # ESLint (proíbe trim e APIs de rede em src/)
npm run validate:layout  # valida src/layouts/** contra o JSON Schema
```

O round-trip de todos os golden files (`npm run test:golden`) é gate de merge (constituição, Princípio IV).

## Golden files: somente dados fictícios

Os arquivos de referência ficam em `tests/golden/febraban-cnab240-v10.11/{valid,invalid}/`, cada um com um `*.expected.json`. Eles são gerados por `npx tsx scripts/generate-golden.ts` a partir das definições de layout. O formato está em [tests/golden/README.md](tests/golden/README.md).

- **Nunca** versione arquivos CNAB reais de clientes, nem parcialmente anonimizados (Princípio V). Nomes, CPF/CNPJ, agências, contas e valores devem ser inventados.
- Todo bug corrigido ganha um golden file ou teste que o reproduza.
- Toda definição de layout precisa de ao menos um golden file. O teste de parse falha se alguma ficar sem.
- Alterações em `src/layouts/` citam o manual e a versão no PR. A cobertura da transcrição está em [COVERAGE.md](src/layouts/febraban-cnab240-v10.11/COVERAGE.md).

## Spec Kit

As pastas `.specify/` e `.claude/` são geradas pelo Spec Kit e versionadas no repositório. Para recriá-las do zero:

```sh
# Instala o uv (gerenciador de pacotes e ambientes Python da Astral) via winget
winget install --id=astral-sh.uv -e

# Cria e ativa o ambiente virtual Python do projeto (venv)
uv venv venv
.\venv\Scripts\activate

# Instala o Specify CLI (Spec Kit, do GitHub) e inicializa na pasta atual
uv tool install specify-cli --python 3.12 --from git+https://github.com/github/spec-kit.git
specify.exe init --here --ignore-agent-tools
```
