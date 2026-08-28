import { fromCents, roundHalfAwayFromZero, toCents } from "./money";

export interface CommissionInput {
  /** Valor unitario do procedimento, em reais. */
  valorUnitario: number;
  /** Quantidade de sessoes lancadas no atendimento. */
  quantidade: number;
  /** Percentual de comissao (0 a 100) vigente no momento do lancamento. */
  comissaoPercentual: number;
}

export interface CommissionBreakdown {
  valorTotal: number;
  valorComissao: number;
  valorClinica: number;
}

export class CommissionInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommissionInputError";
  }
}

function assertInput({ valorUnitario, quantidade, comissaoPercentual }: CommissionInput): void {
  if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
    throw new CommissionInputError("Valor unitario deve ser um número maior ou igual a zero.");
  }
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new CommissionInputError("Quantidade deve ser um inteiro maior que zero.");
  }
  if (!Number.isFinite(comissaoPercentual) || comissaoPercentual < 0 || comissaoPercentual > 100) {
    throw new CommissionInputError("Percentual de comissão deve estar entre 0 e 100.");
  }
}

/**
 * Regra financeira central do GlowScale.
 *
 *   valor_total    = round(valor_unitario * quantidade, 2)
 *   valor_comissao = round(valor_total * (comissao_percentual / 100), 2)
 *   valor_clinica  = valor_total - valor_comissao
 *
 * A conta e feita em centavos e reproduz exatamente as colunas geradas da
 * tabela `atendimentos`, para que preview na UI e valor persistido coincidam.
 */
export function calculateCommission(input: CommissionInput): CommissionBreakdown {
  assertInput(input);

  const totalCents = toCents(input.valorUnitario) * input.quantidade;
  // percentual em "pontos base" (2 casas decimais) mantem a conta em inteiros
  const percentualBasisPoints = roundHalfAwayFromZero(input.comissaoPercentual * 100);
  const comissaoCents = roundHalfAwayFromZero((totalCents * percentualBasisPoints) / 10_000);
  const clinicaCents = totalCents - comissaoCents;

  return {
    valorTotal: fromCents(totalCents),
    valorComissao: fromCents(comissaoCents),
    valorClinica: fromCents(clinicaCents),
  };
}

export interface ResumoFinanceiro {
  faturamento: number;
  comissoes: number;
  repasseClinica: number;
  quantidadeAtendimentos: number;
}

export const RESUMO_FINANCEIRO_VAZIO: ResumoFinanceiro = {
  faturamento: 0,
  comissoes: 0,
  repasseClinica: 0,
  quantidadeAtendimentos: 0,
};

/** Consolida linhas ja calculadas pelo banco, somando em centavos. */
export function consolidarResumo(
  linhas: readonly {
    valor_total: number;
    valor_comissao: number;
    valor_clinica: number;
  }[],
): ResumoFinanceiro {
  let faturamentoCents = 0;
  let comissoesCents = 0;
  let clinicaCents = 0;

  for (const linha of linhas) {
    faturamentoCents += toCents(linha.valor_total);
    comissoesCents += toCents(linha.valor_comissao);
    clinicaCents += toCents(linha.valor_clinica);
  }

  return {
    faturamento: fromCents(faturamentoCents),
    comissoes: fromCents(comissoesCents),
    repasseClinica: fromCents(clinicaCents),
    quantidadeAtendimentos: linhas.length,
  };
}

/** Percentual medio efetivo de comissao sobre o faturamento. */
export function percentualEfetivo(faturamento: number, comissoes: number): number {
  const faturamentoCents = toCents(faturamento);
  if (faturamentoCents === 0) return 0;
  return roundHalfAwayFromZero((toCents(comissoes) / faturamentoCents) * 10_000) / 100;
}
