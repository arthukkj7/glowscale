import "server-only";

import type { ResumoFinanceiro } from "@/lib/calculations/commission";
import { hojeNaClinica, primeiroDiaDoMes, ultimoDiaDoMes } from "@/lib/utils/date";
import { contextoDaClinica } from "./context";
import { relatorioPorProfissional, resumoDoPeriodo, type LinhaRelatorio } from "./financeiro";
import { listarProximosTurnos, type TurnoDaEscala } from "./escalas";

export interface DadosDoDashboard {
  periodo: { inicio: string; fim: string };
  resumo: ResumoFinanceiro;
  ranking: LinhaRelatorio[];
  proximosTurnos: TurnoDaEscala[];
  profissionaisAtivas: number;
  procedimentosAtivos: number;
}

/** Indicadores do mes corrente no fuso da clinica. */
export async function carregarDashboard(): Promise<DadosDoDashboard> {
  const { supabase, clinicaId, sessao } = await contextoDaClinica();

  const hoje = hojeNaClinica(sessao.clinica.timezone);
  const inicio = primeiroDiaDoMes(hoje);
  const fim = ultimoDiaDoMes(hoje);

  const [resumo, ranking, proximosTurnos, profissionais, procedimentos] = await Promise.all([
    resumoDoPeriodo({ dataInicial: inicio, dataFinal: fim, status: "realizado" }),
    relatorioPorProfissional({ dataInicial: inicio, dataFinal: fim, status: "realizado" }),
    listarProximosTurnos(hoje, 6),
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

  if (profissionais.error) throw profissionais.error;
  if (procedimentos.error) throw procedimentos.error;

  return {
    periodo: { inicio, fim },
    resumo,
    ranking: ranking.slice(0, 5),
    proximosTurnos,
    profissionaisAtivas: profissionais.count ?? 0,
    procedimentosAtivos: procedimentos.count ?? 0,
  };
}
