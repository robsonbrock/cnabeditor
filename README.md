# cnabeditor

## Rodando localmente

As pastas `.specify/` e `.claude/` não são versionadas (estão no `.gitignore`). Por isso, depois de clonar o repositório, rode os comandos abaixo na raiz do projeto para gerá-las:

```sh
# Instala o uv (gerenciador de pacotes e ambientes Python da Astral) via winget
winget install --id=astral-sh.uv -e

# Ativa o ambiente virtual Python do projeto (venv)
.\venv\Scripts\activate

# Instala o Specify CLI (Spec Kit, do GitHub) como ferramenta global via uv, usando Python 3.12
uv tool install specify-cli --python 3.12 --from git+https://github.com/github/spec-kit.git

# Inicializa o Spec Kit na pasta atual (--here), sem verificar se as ferramentas de agente de IA estão instaladas (--ignore-agent-tools)
specify.exe init --here --ignore-agent-tools
```
