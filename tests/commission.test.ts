import { describe, expect, it } from "vitest";

import {
  CommissionInputError,
  calculateCommission,
  consolidarResumo,
  percentualEfetivo,
} from "@/lib/calculations/commission";

describe("calculateCommission - regra critica de comissao", () => {
  it("aplica 40% sobre um procedimento de R$ 200", () => {
    expect(calculateCommission({ valorUnitario: 200, quantidade: 1, comissaoPercentual: 40 })).toEqual(
      { valorTotal: 200, valorComissao: 80, valorClinica: 120 },
    );
  });

  it("com comissao 0% o valor inteiro fica com a clinica", () => {
    expect(calculateCommission({ valorUnitario: 200, quantidade: 1, comissaoPercentual: 0 })).toEqual(
      { valorTotal: 200, valorComissao: 0, valorClinica: 200 },
    );
  });

  it("com comissao 100% o valor inteiro vai para a profissional", () => {
    expect(
      calculateCommission({ valorUnitario: 200, quantidade: 1, comissaoPercentual: 100 }),
    ).toEqual({ valorTotal: 200, valorComissao: 200, valorClinica: 0 });
  });

  it("multiplica pela quantidade antes de aplicar a comissao", () => {
    expect(calculateCommission({ valorUnitario: 200, quantidade: 2, comissaoPercentual: 40 })).toEqual(
      { valorTotal: 400, valorComissao: 160, valorClinica: 240 },
    );
  });

  it("mantem a soma exata mesmo com percentual quebrado", () => {
    const resultado = calculateCommission({
      valorUnitario: 99.99,
      quantidade: 3,
      comissaoPercentual: 33.33,
    });
    expect(resultado.valorTotal).toBe(299.97);
    expect(resultado.valorComissao).toBe(99.98);
    // A soma das partes sempre reconstitui o total, sem centavo perdido.
    expect(resultado.valorComissao + resultado.valorClinica).toBeCloseTo(resultado.valorTotal, 2);
  });

  it("nao acumula erro de ponto flutuante em valores com centavos", () => {
    const resultado = calculateCommission({
      valorUnitario: 0.1,
      quantidade: 3,
      comissaoPercentual: 50,
    });
    expect(resultado.valorTotal).toBe(0.3);
    expect(resultado.valorComissao).toBe(0.15);
    expect(resultado.valorClinica).toBe(0.15);
  });

  it("arredonda a comissao para 2 casas, como o banco", () => {
    // 150.55 * 1 * 12.5% = 18.81875 -> 18.82
    const resultado = calculateCommission({
      valorUnitario: 150.55,
      quantidade: 1,
      comissaoPercentual: 12.5,
    });
    expect(resultado.valorComissao).toBe(18.82);
    expect(resultado.valorClinica).toBe(131.73);
  });

  it("recusa quantidade zero ou negativa", () => {
    expect(() =>
      calculateCommission({ valorUnitario: 100, quantidade: 0, comissaoPercentual: 10 }),
    ).toThrow(CommissionInputError);
  });

  it("recusa percentual fora do intervalo 0-100", () => {
    expect(() =>
      calculateCommission({ valorUnitario: 100, quantidade: 1, comissaoPercentual: 120 }),
    ).toThrow(CommissionInputError);
    expect(() =>
      calculateCommission({ valorUnitario: 100, quantidade: 1, comissaoPercentual: -1 }),
    ).toThrow(CommissionInputError);
  });

  it("recusa valor unitario negativo", () => {
    expect(() =>
      calculateCommission({ valorUnitario: -10, quantidade: 1, comissaoPercentual: 10 }),
    ).toThrow(CommissionInputError);
  });
});

describe("consolidarResumo", () => {
  it("soma as linhas em centavos, sem drift", () => {
    const resumo = consolidarResumo([
      { valor_total: 0.1, valor_comissao: 0.05, valor_clinica: 0.05 },
      { valor_total: 0.2, valor_comissao: 0.1, valor_clinica: 0.1 },
      { valor_total: 0.3, valor_comissao: 0.15, valor_clinica: 0.15 },
    ]);
    expect(resumo).toEqual({
      faturamento: 0.6,
      comissoes: 0.3,
      repasseClinica: 0.3,
      quantidadeAtendimentos: 3,
    });
  });

  it("devolve zeros para lista vazia", () => {
    expect(consolidarResumo([])).toEqual({
      faturamento: 0,
      comissoes: 0,
      repasseClinica: 0,
      quantidadeAtendimentos: 0,
    });
  });
});

describe("percentualEfetivo", () => {
  it("calcula o percentual medio sobre o faturamento", () => {
    expect(percentualEfetivo(3500, 1400)).toBe(40);
  });

  it("evita divisao por zero", () => {
    expect(percentualEfetivo(0, 0)).toBe(0);
  });
});
