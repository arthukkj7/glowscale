import "server-only";

import { PAGINACAO_PADRAO } from "@/lib/constants";
import type { ProcedimentoRow } from "@/types/database";
import {
  calcularIntervalo,
  contextoDaClinica,
  montarPaginacao,
  type ResultadoPaginado,
} from "./context";

export interface FiltroProcedimentos {
  pagina?: number;
  busca?: string;
  apenasAtivos?: boolean;
}

export async function listarProcedimentos(
  filtro: FiltroProcedimentos = {},
): Promise<ResultadoPaginado<ProcedimentoRow>> {
  const { supabase, clinicaId } = await contextoDaClinica();
  const { inicio, fim, pagina } = calcularIntervalo(filtro.pagina ?? 1, PAGINACAO_PADRAO);

  let query = supabase
    .from("procedimentos")
    .select("*", { count: "exact" })
    .eq("clinica_id", clinicaId);

  if (filtro.apenasAtivos) query = query.eq("ativo", true);
  if (filtro.busca) {
    const termo = filtro.busca.replace(/[%_]/g, "\\$&");
    query = query.ilike("nome", `%${termo}%`);
  }

  const { data, error, count } = await query
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true })
    .range(inicio, fim);

  if (error) throw error;
  return montarPaginacao(data ?? [], count ?? 0, pagina, PAGINACAO_PADRAO);
}

export async function listarProcedimentosAtivos(): Promise<ProcedimentoRow[]> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("procedimentos")
    .select("*")
    .eq("clinica_id", clinicaId)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function contarAtendimentosDoProcedimento(procedimentoId: string): Promise<number> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { count, error } = await supabase
    .from("atendimentos")
    .select("id", { count: "exact", head: true })
    .eq("clinica_id", clinicaId)
    .eq("procedimento_id", procedimentoId);

  if (error) throw error;
  return count ?? 0;
}
