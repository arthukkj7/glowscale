import "server-only";

import type { ResumoFinanceiro } from "@/lib/calculations/commission";
import {
  hojeNaClinica,
  mesAnterior,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
} from "@/lib/utils/date";
import type { AgendamentoDaAgenda, ClienteInativo } from "@/types/database";
import { agendamentosDoDia } from "./agenda";
import { contextoDaClinica } from "./context";
import { relatorioPorProfissional, resumoDoPeriodo, type LinhaRelatorio } from "./financeiro";

/** Dias sem retornar a partir dos quais uma cliente entra na lista de reativacao. */
const DIAS_PARA_REATIVAR = 30;

export interface DadosDoPainel {
  hoje: string;
  periodo: { inicio: string; fim: string };
  resumo: ResumoFinanceiro;
  /** Variacao do faturamento sobre o mes anterior, em %. null quando nao da para comparar. */
  variacaoFaturamento: number | null;
  ranking: LinhaRelatorio[];
  agendaDeHoje: AgendamentoDaAgenda[];
  agendamentosNoMes: number;
  totalDeClientes: number;
  clientesNovosNoMes: number;
  clientesInativos: ClienteInativo[];
  profissionaisAtivas: number;
  procedimentosAtivos: number;
}

export async function carregarPainel(): Promise<DadosDoPainel> {
  const { supabase, clinicaId, sessao } = await contextoDaClinica();

  const hoje = hojeNaClinica(sessao.clinica.timezone);
  const inicio = primeiroDiaDoMes(hoje);
  const fim = ultimoDiaDoMes(hoje);
  const anterior = mesAnterior(hoje);

  const [
    resumo,
    resumoAnterior,
    ranking,
    agendaDeHoje,
    agendamentosMes,
    clientesTotal,
    clientesNovos,
    inativos,
    profissionais,
    procedimentos,
  ] = await Promise.all([
    resumoDoPeriodo({ dataInicial: inicio, dataFinal: fim, status: "realizado" }),
    resumoDoPeriodo({
      dataInicial: anterior.inicio,
      dataFinal: anterior.fim,
      status: "realizado",
    }),
    relatorioPorProfissional({ dataInicial: inicio, dataFinal: fim, status: "realizado" }),
    agendamentosDoDia(hoje),
    supabase
      .from("agendamentos")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinicaId)
      .gte("data", inicio)
      .lte("data", fim)
      .neq("status", "cancelado"),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinicaId)
      .eq("ativo", true),
    supabase
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinicaId)
      .gte("created_at", `${inicio}T00:00:00`),
    supabase.rpc("clientes_inativos", { p_dias: DIAS_PARA_REATIVAR, p_limite: 20 }),
    supabase
      .from("profissionais")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinicaId)
      .eq("ativo", true),
    supabase
      .from("procedimentos")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinicaId)
      .eq("ativo", true),
  ]);

  for (const r of [agendamentosMes, clientesTotal, clientesNovos, profissionais, procedimentos]) {
    if (r.error) throw r.error;
  }
  if (inativos.error) throw inativos.error;

  // Sem faturamento no mes anterior nao existe variacao percentual: dividir por
  // zero daria Infinity, e "+∞%" no painel nao informa nada. Melhor nao mostrar.
  const anteriorFaturou = resumoAnterior.faturamento > 0;
  const variacaoFaturamento = anteriorFaturou
    ? ((resumo.faturamento - resumoAnterior.faturamento) / resumoAnterior.faturamento) * 100
    : null;

  return {
    hoje,
    periodo: { inicio, fim },
    resumo,
    variacaoFaturamento,
    ranking: ranking.slice(0, 5),
    agendaDeHoje,
    agendamentosNoMes: agendamentosMes.count ?? 0,
    totalDeClientes: clientesTotal.count ?? 0,
    clientesNovosNoMes: clientesNovos.count ?? 0,
    clientesInativos: inativos.data ?? [],
    profissionaisAtivas: profissionais.count ?? 0,
    procedimentosAtivos: procedimentos.count ?? 0,
  };
}

export { DIAS_PARA_REATIVAR };
