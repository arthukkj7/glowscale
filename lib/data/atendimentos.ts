import "server-only";

import { PAGINACAO_PADRAO } from "@/lib/constants";
import type { AtendimentoRow, AtendimentoStatus } from "@/types/database";
import {
  calcularIntervalo,
  contextoDaClinica,
  montarPaginacao,
  type ResultadoPaginado,
} from "./context";

export interface AtendimentoComRelacoes extends AtendimentoRow {
  profissional_nome: string;
  procedimento_nome: string;
}

export interface FiltroAtendimentos {
  pagina?: number;
  dataInicial?: string;
  dataFinal?: string;
  profissionalId?: string;
  status?: AtendimentoStatus;
}

/**
 * Lista paginada de atendimentos com os nomes de profissional e procedimento.
 *
 * Os nomes vem de duas consultas auxiliares em vez de embed do PostgREST:
 * o vinculo usa chave estrangeira composta (id, clinica_id), cujo embed exige
 * hint especifico. Duas queries indexadas sao mais previsiveis e igualmente
 * baratas para uma pagina de resultados.
 */
export async function listarAtendimentos(
  filtro: FiltroAtendimentos = {},
): Promise<ResultadoPaginado<AtendimentoComRelacoes>> {
  const { supabase, clinicaId } = await contextoDaClinica();
  const { inicio, fim, pagina } = calcularIntervalo(filtro.pagina ?? 1, PAGINACAO_PADRAO);

  let query = supabase
    .from("atendimentos")
    .select("*", { count: "exact" })
    .eq("clinica_id", clinicaId);

  if (filtro.dataInicial) query = query.gte("data_atendimento", filtro.dataInicial);
  if (filtro.dataFinal) query = query.lte("data_atendimento", filtro.dataFinal);
  if (filtro.profissionalId) query = query.eq("profissional_id", filtro.profissionalId);
  if (filtro.status) query = query.eq("status", filtro.status);

  const { data, error, count } = await query
    .order("data_atendimento", { ascending: false })
    .order("created_at", { ascending: false })
    .range(inicio, fim);

  if (error) throw error;

  const atendimentos = data ?? [];
  if (atendimentos.length === 0) {
    return montarPaginacao([], count ?? 0, pagina, PAGINACAO_PADRAO);
  }

  const idsProfissionais = [...new Set(atendimentos.map((a) => a.profissional_id))];
  const idsProcedimentos = [...new Set(atendimentos.map((a) => a.procedimento_id))];

  const [profissionais, procedimentos] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome")
      .eq("clinica_id", clinicaId)
      .in("id", idsProfissionais),
    supabase
      .from("procedimentos")
      .select("id, nome")
      .eq("clinica_id", clinicaId)
      .in("id", idsProcedimentos),
  ]);

  if (profissionais.error) throw profissionais.error;
  if (procedimentos.error) throw procedimentos.error;

  const nomeProfissional = new Map((profissionais.data ?? []).map((p) => [p.id, p.nome]));
  const nomeProcedimento = new Map((procedimentos.data ?? []).map((p) => [p.id, p.nome]));

  const registros: AtendimentoComRelacoes[] = atendimentos.map((atendimento) => ({
    ...atendimento,
    profissional_nome: nomeProfissional.get(atendimento.profissional_id) ?? "Profissional removida",
    procedimento_nome: nomeProcedimento.get(atendimento.procedimento_id) ?? "Procedimento removido",
  }));

  return montarPaginacao(registros, count ?? 0, pagina, PAGINACAO_PADRAO);
}

export async function buscarAtendimento(id: string): Promise<AtendimentoRow | null> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("atendimentos")
    .select("*")
    .eq("clinica_id", clinicaId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
