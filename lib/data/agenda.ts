import "server-only";

import type { AgendamentoDaAgenda } from "@/types/database";
import { contextoDaClinica } from "./context";

/**
 * Agendamentos de um intervalo, ja com os nomes resolvidos.
 *
 * Um dia e um intervalo de um dia so; a visao semanal usa o mesmo caminho com
 * sete. Manter uma funcao evita que as duas telas divirjam no que consideram
 * "ocupado".
 */
export async function agendamentosNoPeriodo(
  dataInicial: string,
  dataFinal: string,
  filtro: { profissionalId?: string } = {},
): Promise<AgendamentoDaAgenda[]> {
  const { supabase, clinicaId } = await contextoDaClinica();

  let query = supabase
    .from("agendamentos")
    .select(
      "*, clientes(nome, telefone), profissionais(nome), procedimentos(nome, valor)",
    )
    .eq("clinica_id", clinicaId)
    .gte("data", dataInicial)
    .lte("data", dataFinal);

  if (filtro.profissionalId) query = query.eq("profissional_id", filtro.profissionalId);

  const { data, error } = await query
    .order("data", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) throw error;

  // PostgREST devolve objeto ou array conforme a cardinalidade que infere.
  const um = <T,>(v: T | T[] | null): T | null =>
    !v ? null : Array.isArray(v) ? (v[0] ?? null) : v;

  type ComRelacoes = Record<string, unknown> & {
    tipo?: string;
    clientes: ClienteResumido | ClienteResumido[] | null;
    profissionais: { nome: string } | { nome: string }[] | null;
    procedimentos: { nome: string; valor: number } | { nome: string; valor: number }[] | null;
  };
  type ClienteResumido = { nome: string; telefone: string | null };

  return ((data ?? []) as unknown as ComRelacoes[]).map((linha) => {
    const { clientes, profissionais, procedimentos, ...resto } = linha;
    const servico = um(procedimentos);
    const cliente = um(clientes);
    const ehBloqueio = linha.tipo === "bloqueio";
    return {
      ...(resto as unknown as AgendamentoDaAgenda),
      cliente_nome: cliente?.nome ?? null,
      cliente_telefone: cliente?.telefone ?? null,
      profissional_nome: um(profissionais)?.nome ?? "—",
      // Bloqueio nao tem servico; o rotulo entra aqui para a tela nao precisar
      // saber disso em cada lugar que exibe a linha.
      servico_nome: ehBloqueio ? "Bloqueado" : (servico?.nome ?? "—"),
      servico_valor: servico?.valor ?? 0,
    };
  });
}

export async function agendamentosDoDia(
  data: string,
  filtro: { profissionalId?: string } = {},
): Promise<AgendamentoDaAgenda[]> {
  return agendamentosNoPeriodo(data, data, filtro);
}
