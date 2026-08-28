import "server-only";

import type { AtendimentoStatus } from "@/types/database";
import { sumCurrency } from "@/lib/calculations/money";
import type { ResumoFinanceiro } from "@/lib/calculations/commission";
import { contextoDaClinica } from "./context";

export interface FiltroRelatorio {
  dataInicial: string;
  dataFinal: string;
  profissionalId?: string | null;
  /** null significa "todos os status". */
  status?: AtendimentoStatus | null;
}

export interface LinhaRelatorio {
  profissionalId: string;
  profissionalNome: string;
  quantidade: number;
  faturamento: number;
  comissao: number;
  valorClinica: number;
  comissaoPercentualMedia: number;
}

/** Consolidacao por profissional. O agrupamento acontece no PostgreSQL. */
export async function relatorioPorProfissional(
  filtro: FiltroRelatorio,
): Promise<LinhaRelatorio[]> {
  const { supabase } = await contextoDaClinica();

  const { data, error } = await supabase.rpc("relatorio_financeiro", {
    p_data_inicial: filtro.dataInicial,
    p_data_final: filtro.dataFinal,
    p_profissional_id: filtro.profissionalId ?? null,
    p_status: filtro.status ?? null,
  });

  if (error) throw error;

  return (data ?? []).map((linha) => ({
    profissionalId: linha.profissional_id,
    profissionalNome: linha.profissional_nome,
    quantidade: Number(linha.quantidade),
    faturamento: Number(linha.faturamento),
    comissao: Number(linha.comissao),
    valorClinica: Number(linha.valor_clinica),
    comissaoPercentualMedia: Number(linha.comissao_percentual_media),
  }));
}

/** Totais do periodo, calculados no banco. */
export async function resumoDoPeriodo(filtro: FiltroRelatorio): Promise<ResumoFinanceiro> {
  const { supabase } = await contextoDaClinica();

  const { data, error } = await supabase.rpc("resumo_financeiro", {
    p_data_inicial: filtro.dataInicial,
    p_data_final: filtro.dataFinal,
    p_profissional_id: filtro.profissionalId ?? null,
    p_status: filtro.status ?? null,
  });

  if (error) throw error;

  const linha = data?.[0];
  return {
    faturamento: Number(linha?.faturamento ?? 0),
    comissoes: Number(linha?.comissao ?? 0),
    repasseClinica: Number(linha?.valor_clinica ?? 0),
    quantidadeAtendimentos: Number(linha?.quantidade ?? 0),
  };
}

/** Soma as linhas do relatorio, util para o rodape da tabela. */
export function totalizarLinhas(linhas: readonly LinhaRelatorio[]) {
  return {
    quantidade: linhas.reduce((acc, linha) => acc + linha.quantidade, 0),
    faturamento: sumCurrency(linhas.map((linha) => linha.faturamento)),
    comissao: sumCurrency(linhas.map((linha) => linha.comissao)),
    valorClinica: sumCurrency(linhas.map((linha) => linha.valorClinica)),
  };
}
