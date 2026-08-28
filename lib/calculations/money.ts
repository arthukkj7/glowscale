/**
 * Helpers monetarios.
 *
 * Regra do projeto: dinheiro nunca e somado ou multiplicado diretamente como
 * float. Toda aritmetica acontece em centavos (inteiros) e so volta para
 * `number` decimal na fronteira com o banco (numeric(12,2)) e com a UI.
 */

const CENTS_PER_UNIT = 100;

/** Arredondamento "half away from zero", igual ao round() do PostgreSQL. */
export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Converte um valor em reais para centavos inteiros. */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("Valor monetario inválido.");
  }
  // O epsilon compensa representacoes como 8.115 -> 8.114999999999999.
  return roundHalfAwayFromZero(value * CENTS_PER_UNIT + Number.EPSILON * Math.sign(value));
}

/** Converte centavos inteiros de volta para reais com 2 casas. */
export function fromCents(cents: number): number {
  return roundHalfAwayFromZero(cents) / CENTS_PER_UNIT;
}

/** Soma uma lista de valores em reais sem acumular erro de ponto flutuante. */
export function sumCurrency(values: readonly number[]): number {
  return fromCents(values.reduce((acc, value) => acc + toCents(value), 0));
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata um valor em reais: 1234.5 -> "R$ 1.234,50". */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return currencyFormatter.format(0);
  }
  return currencyFormatter.format(fromCents(toCents(value)));
}

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formata um percentual: 40 -> "40%", 12.5 -> "12,5%". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "0%";
  }
  return `${percentFormatter.format(value)}%`;
}

/**
 * Interpreta texto digitado pelo usuario no formato brasileiro.
 * Aceita "1.234,56", "1234,56", "1234.56" e "R$ 1.234,56".
 * Retorna null quando a entrada nao representa um numero valido.
 */
export function parseCurrencyInput(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? fromCents(toCents(raw)) : null;
  }
  if (raw === null || raw === undefined) return null;

  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (cleaned === "" || cleaned === "-") return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma > lastDot) {
    // virgula e o separador decimal: remove os pontos de milhar
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return fromCents(toCents(parsed));
}

/** Mascara de digitacao: "12345" -> "123,45". Usada pelo CurrencyInput. */
export function formatCurrencyMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  if (digits === "") return "";
  const cents = Number(digits);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / CENTS_PER_UNIT);
}
