import "server-only";

import type { EscalaRow } from "@/types/database";
import { contextoDaClinica } from "./context";

export interface TurnoDaEscala extends EscalaRow {
  profissional_nome: string;
}

/** Turnos de um intervalo de datas (a tela usa sempre uma semana). */
export async function listarEscalasDoPeriodo(
  dataInicial: string,
  dataFinal: string,
): Promise<TurnoDaEscala[]> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("escalas")
    .select("*")
    .eq("clinica_id", clinicaId)
    .gte("data", dataInicial)
    .lte("data", dataFinal)
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) throw error;

  const escalas = data ?? [];
  if (escalas.length === 0) return [];

  const ids = [...new Set(escalas.map((escala) => escala.profissional_id))];
  const { data: profissionais, error: erroProfissionais } = await supabase
    .from("profissionais")
    .select("id, nome")
    .eq("clinica_id", clinicaId)
    .in("id", ids);

  if (erroProfissionais) throw erroProfissionais;

  const nomes = new Map((profissionais ?? []).map((p) => [p.id, p.nome]));

  return escalas.map((escala) => ({
    ...escala,
    profissional_nome: nomes.get(escala.profissional_id) ?? "Profissional removida",
  }));
}

/** Proximos turnos a partir de hoje, para o resumo do dashboard. */
export async function listarProximosTurnos(
  aPartirDe: string,
  limite = 6,
): Promise<TurnoDaEscala[]> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("escalas")
    .select("*")
    .eq("clinica_id", clinicaId)
    .gte("data", aPartirDe)
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true })
    .limit(limite);

  if (error) throw error;

  const escalas = data ?? [];
  if (escalas.length === 0) return [];

  const ids = [...new Set(escalas.map((escala) => escala.profissional_id))];
  const { data: profissionais, error: erroProfissionais } = await supabase
    .from("profissionais")
    .select("id, nome")
    .eq("clinica_id", clinicaId)
    .in("id", ids);

  if (erroProfissionais) throw erroProfissionais;

  const nomes = new Map((profissionais ?? []).map((p) => [p.id, p.nome]));

  return escalas.map((escala) => ({
    ...escala,
    profissional_nome: nomes.get(escala.profissional_id) ?? "Profissional removida",
  }));
}
