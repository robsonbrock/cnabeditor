// Estratégias de valor do gerador (research G4, contracts/core-api.md › Estratégias).
// Parametrizadas só pelo FieldDefinition (tamanho, tipo, decimais); nunca por posição.
import { padValue } from "../validate/field";
import type { FieldDefinition, GenerationDirection, StrategyName } from "../types";
import type { Rng } from "./rng";

export interface StrategyContext {
  field: FieldDefinition;
  rng: Rng;
  today: Date;
  direction: GenerationDirection;
  /** Estado do registro em montagem: o tipo de inscrição sorteado alimenta o número logo depois. */
  scratch: Record<string, string>;
  /** Contador do arquivo, para identificadores únicos. */
  nextId: () => number;
}

export type Strategy = (ctx: StrategyContext) => string;

const PRENOMES = ["ANA", "BRUNO", "CARLA", "DIEGO", "ELISA", "FABIO", "GISELE", "HUGO", "IARA", "JOAO", "KARINA", "LUCAS", "MARIA", "NUNO", "OTAVIO", "PAULA", "RAFAEL", "SILVIA", "TIAGO", "VERA"];
const SOBRENOMES = ["ALMEIDA", "BARBOSA", "CARDOSO", "DIAS", "FERREIRA", "GOMES", "LIMA", "MARTINS", "NUNES", "OLIVEIRA", "PEREIRA", "RIBEIRO", "SANTOS", "SOUZA", "TEIXEIRA"];
const RAMOS = ["COMERCIO", "SERVICOS", "INDUSTRIA", "LOGISTICA", "TECNOLOGIA", "ALIMENTOS", "CONSTRUCOES", "DISTRIBUIDORA"];
const SUFIXOS = ["LTDA", "S.A.", "ME", "EIRELI"];
const LOGRADOUROS = ["RUA", "AVENIDA", "TRAVESSA", "ALAMEDA", "PRACA"];
const NOMES_RUA = ["DAS FLORES", "DOS IPES", "SAO JOSE", "BRASIL", "DAS PALMEIRAS", "SETE DE SETEMBRO", "DO COMERCIO", "DAS ACACIAS"];
const CIDADES = ["SAO PAULO", "CAMPINAS", "CURITIBA", "BELO HORIZONTE", "PORTO ALEGRE", "SALVADOR", "RECIFE", "FORTALEZA", "GOIANIA", "FLORIANOPOLIS", "MANAUS", "BELEM"];
const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
const HEX = "0123456789ABCDEF";

const fit = (f: FieldDefinition, v: string) => padValue(f, v.slice(0, f.size));
const two = (n: number) => String(n).padStart(2, "0");

function cpf(rng: Rng): string {
  const d = [...rng.digits(9)].map(Number);
  for (const n of [9, 10]) {
    const r = (d.slice(0, n).reduce((s, x, i) => s + x * (n + 1 - i), 0) * 10) % 11;
    d.push(r === 10 ? 0 : r);
  }
  return d.join("");
}

function cnpj(rng: Rng): string {
  const d = [...(rng.digits(8) + "0001")].map(Number);
  for (const w of [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]]) {
    const r = d.reduce((s, x, i) => s + x * w[i], 0) % 11;
    d.push(r < 2 ? 0 : 11 - r);
  }
  return d.join("");
}

/** DV geral do código de barras FEBRABAN: módulo 11, pesos 2..9 da direita, resultado 0/10/11 ⇒ 1. */
function barcodeDv(body43: string): number {
  let sum = 0;
  let w = 2;
  for (let i = body43.length - 1; i >= 0; i--) {
    sum += Number(body43[i]) * w;
    w = w === 9 ? 2 : w + 1;
  }
  const r = 11 - (sum % 11);
  return r === 0 || r === 10 || r === 11 ? 1 : r;
}

function ddmmaaaa(base: Date, offsetDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  return `${two(d.getDate())}${two(d.getMonth() + 1)}${d.getFullYear()}`;
}

/** Inteiro em centavos [100, 5.000.000] escalado para os decimais do campo (BigInt, sem float). */
function valor({ field, rng }: StrategyContext): string {
  const cents = BigInt(rng.int(100, 5_000_000));
  const decimals = field.decimals ?? 2;
  const scaled = decimals >= 2 ? cents * 10n ** BigInt(decimals - 2) : cents / 10n ** BigInt(2 - decimals) || 1n;
  const text = scaled.toString();
  return text.length <= field.size ? padValue(field, text) : padValue(field, "9".repeat(field.size));
}

export const STRATEGIES: Record<StrategyName, Strategy> = {
  blank: ({ field }) => padValue(field, ""),
  inscricao: (ctx) => {
    const { field, rng, scratch } = ctx;
    if (field.size === 1) return (scratch.tipoInscricao = rng.pick(["1", "2"]));
    const tipo = scratch.tipoInscricao ?? rng.pick(["1", "2"]);
    delete scratch.tipoInscricao;
    return padValue(field, tipo === "1" ? cpf(rng) : cnpj(rng));
  },
  agencia: ({ field, rng }) => padValue(field, String(rng.int(1, Math.min(9999, 10 ** field.size - 1)))),
  conta: ({ field, rng }) => padValue(field, String(rng.int(1000, Math.min(99_999_999, 10 ** field.size - 1)))),
  dv: ({ field, rng }) => padValue(field, String(rng.int(0, 9))),
  banco: ({ field, rng }) => padValue(field, rng.digits(Math.min(3, field.size))),
  nomePessoa: ({ field, rng }) => fit(field, `${rng.pick(PRENOMES)} ${rng.pick(SOBRENOMES)} ${rng.pick(SOBRENOMES)}`),
  nomeEmpresa: ({ field, rng }) => fit(field, `${rng.pick(SOBRENOMES)} ${rng.pick(RAMOS)} ${rng.pick(SUFIXOS)}`),
  valor,
  dataFutura: ({ field, rng, today }) => fit(field, ddmmaaaa(today, rng.int(1, 60))),
  dataPassada: ({ field, rng, today }) => fit(field, ddmmaaaa(today, -rng.int(1, 30))),
  hora: ({ field, rng }) => fit(field, `${two(rng.int(0, 23))}${two(rng.int(0, 59))}${two(rng.int(0, 59))}`),
  codigoBarras44: ({ field, rng }) => {
    if (field.size !== 44) return padValue(field, rng.digits(field.size));
    // Banco fictício + moeda 9 + fator de vencimento + valor + campo livre; DV na 5ª posição.
    const body = rng.digits(3) + "9" + String(rng.int(1000, 9999)) + rng.digits(10) + rng.digits(25);
    return body.slice(0, 4) + barcodeDv(body) + body.slice(4);
  },
  pixKey: ({ field, rng }) => {
    // Chave aleatória (EVP) em maiúsculas, iniciada por letra (J-52 Pix: COVERAGE.md).
    const hex = (n: number) => Array.from({ length: n }, () => rng.pick([...HEX])).join("");
    const key = `${rng.pick(["A", "B", "C", "D", "E", "F"])}${hex(7)}-${hex(4)}-4${hex(3)}-${rng.pick(["8", "9", "A", "B"])}${hex(3)}-${hex(12)}`;
    return fit(field, key);
  },
  endereco: ({ field, rng }) =>
    field.type === "A" ? fit(field, `${rng.pick(LOGRADOUROS)} ${rng.pick(NOMES_RUA)}`) : padValue(field, String(rng.int(1, 10 ** Math.min(field.size, 4) - 1))),
  cidade: ({ field, rng }) => fit(field, rng.pick(CIDADES)),
  cep: ({ field, rng }) => fit(field, String(rng.int(10 ** (field.size - 1), 10 ** field.size - 1))),
  uf: ({ field, rng }) => fit(field, rng.pick(UFS)),
  documento: ({ field, rng, nextId }) => {
    // Contador garante unicidade no arquivo; o sufixo aleatório só varia a aparência.
    const id = String(nextId());
    const width = Math.min(field.size, Math.max(id.length, 8));
    const counter = id.padStart(width, "0");
    return padValue(field, counter + rng.digits(Math.min(field.size - width, 4)));
  },
  ocorrenciaRetorno: ({ field }) => fit(field, "00"),
};
