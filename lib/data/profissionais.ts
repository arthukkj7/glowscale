import "server-only";

import { PAGINACAO_PADRAO } from "@/lib/constants";
import type { ProfissionalRow } from "@/types/database";
import {
  calcularIntervalo,
  contextoDaClinica,
  montarPaginacao,
  type ResultadoPaginado,
} from "./context";

export interface FiltroProfissionais {
  pagina?: number;
  busca?: string;
  apenasAtivas?: boolean;
}

export async function listarProfissionais(
  filtro: FiltroProfissionais = {},
): Promise<ResultadoPaginado<ProfissionalRow>> {
  const { supabase, clinicaId } = await contextoDaClinica();
  const { inicio, fim, pagina } = calcularIntervalo(filtro.pagina ?? 1, PAGINACAO_PADRAO);

  let query = supabase
    .from("profissionais")
    .select("*", { count: "exact" })
    .eq("clinica_id", clinicaId);

  if (filtro.apenasAtivas) query = query.eq("ativo", true);
  if (filtro.busca) {
    // ilike com escape do curinga para nao permitir wildcard injection.
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

/** Lista enxuta para selects de formulario. */
export async function listarProfissionaisAtivas(): Promise<ProfissionalRow[]> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("profissionais")
    .select("*")
    .eq("clinica_id", clinicaId)
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Quantidade de atendimentos vinculados, para decidir entre excluir e desativar. */
export async function contarAtendimentosDaProfissional(profissionalId: string): Promise<number> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { count, error } = await supabase
    .from("atendimentos")
    .select("id", { count: "exact", head: true })
    .eq("clinica_id", clinicaId)
    .eq("profissional_id", profissionalId);

  if (error) throw error;
  return count ?? 0;
}
