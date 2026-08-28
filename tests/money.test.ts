import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatCurrencyMask,
  formatPercent,
  fromCents,
  parseCurrencyInput,
  sumCurrency,
  toCents,
} from "@/lib/calculations/money";

describe("conversao para centavos", () => {
  it("converte valores decimais sem erro de ponto flutuante", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1)).toBe(10);
    expect(toCents(8.115)).toBe(812);
    expect(toCents(1234.56)).toBe(123456);
  });

  it("faz o caminho de volta", () => {
    expect(fromCents(1999)).toBe(19.99);
    expect(fromCents(0)).toBe(0);
  });

  it("recusa valores nao finitos", () => {
    expect(() => toCents(Number.NaN)).toThrow(RangeError);
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("sumCurrency", () => {
  it("soma sem acumular erro", () => {
    expect(sumCurrency([0.1, 0.2])).toBe(0.3);
    expect(sumCurrency([19.99, 0.01, 100])).toBe(120);
  });
});

describe("parseCurrencyInput", () => {
  it("interpreta o formato brasileiro", () => {
    expect(parseCurrencyInput("1.234,56")).toBe(1234.56);
    expect(parseCurrencyInput("R$ 1.234,56")).toBe(1234.56);
    expect(parseCurrencyInput("200")).toBe(200);
    expect(parseCurrencyInput("200,5")).toBe(200.5);
  });

  it("interpreta o formato com ponto decimal", () => {
    expect(parseCurrencyInput("1234.56")).toBe(1234.56);
  });

  it("aceita numero direto", () => {
    expect(parseCurrencyInput(150.5)).toBe(150.5);
  });

  it("devolve null para entradas invalidas", () => {
    expect(parseCurrencyInput("")).toBeNull();
    expect(parseCurrencyInput("abc")).toBeNull();
    expect(parseCurrencyInput(null)).toBeNull();
    expect(parseCurrencyInput(undefined)).toBeNull();
  });
});

describe("formatacao", () => {
  it("formata moeda em pt-BR", () => {
    // O Intl usa espaco nao separavel entre simbolo e numero.
    expect(formatCurrency(1234.5).replace(/ /g, " ")).toBe("R$ 1.234,50");
    expect(formatCurrency(0).replace(/ /g, " ")).toBe("R$ 0,00");
    expect(formatCurrency(null).replace(/ /g, " ")).toBe("R$ 0,00");
  });

  it("formata percentual", () => {
    expect(formatPercent(40)).toBe("40%");
    expect(formatPercent(12.5)).toBe("12,5%");
    expect(formatPercent(null)).toBe("0%");
  });

  it("aplica mascara de digitacao", () => {
    expect(formatCurrencyMask("12345")).toBe("123,45");
    expect(formatCurrencyMask("5")).toBe("0,05");
    expect(formatCurrencyMask("")).toBe("");
  });
});
