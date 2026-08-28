import "server-only";

import type { ClienteComResumo, ClienteRow } from "@/types/database";
import { contextoDaClinica } from "./context";

const POR_PAGINA = 30;

export interface FiltroClientes {
  pagina?: number;
  busca?: string;
  apenasAtivos?: boolean;
}

export interface ListaDeClientes {
  registros: ClienteComResumo[];
  pagina: number;
  temProxima: boolean;
}

/**
 * Lista clientes ja com o resumo (total gasto, atendimentos, ultimo, preferida).
 *
 * Usa a funcao clientes_com_resumo do banco em vez de buscar os clientes e
 * depois um historico por cliente: com 200 clientes, aquele caminho seriam 201
 * consultas. A RPC roda com SECURITY INVOKER, entao o RLS continua valendo.
 *
 * Pede um registro a mais do que cabe na pagina para saber se existe proxima
 * sem pagar um count(*) sobre a agregacao inteira.
 */
export async function listarClientes(filtro: FiltroClientes = {}): Promise<ListaDeClientes> {
  const { supabase } = await contextoDaClinica();
  const pagina = Math.max(1, filtro.pagina ?? 1);

  const { data, error } = await supabase.rpc("clientes_com_resumo", {
    p_busca: filtro.busca?.trim() || null,
    p_apenas_ativos: filtro.apenasAtivos ?? false,
    p_limite: POR_PAGINA + 1,
    p_deslocamento: (pagina - 1) * POR_PAGINA,
  });

  if (error) throw error;

  const registros = data ?? [];
  return {
    registros: registros.slice(0, POR_PAGINA),
    pagina,
    temProxima: registros.length > POR_PAGINA,
  };
}

/** Cadastro cru de um cliente. Devolve null quando nao e do negocio da sessao. */
export async function buscarCliente(id: string): Promise<ClienteRow | null> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .eq("clinica_id", clinicaId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface AtendimentoDoCliente {
  id: string;
  data_atendimento: string;
  quantidade: number;
  valor_total: number;
  status: string;
  servico: string | null;
  profissional: string | null;
}

/**
 * Historico do cliente, do mais recente para o mais antigo.
 *
 * Traz cancelados junto e marcados: some-los esconderia da recepcao justamente
 * o atendimento que ela precisa conferir quando a cliente reclama.
 */
export async function historicoDoCliente(
  clienteId: string,
  limite = 50,
): Promise<AtendimentoDoCliente[]> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("atendimentos")
    .select(
      "id, data_atendimento, quantidade, valor_total, status, " +
        "procedimentos(nome), profissionais(nome)",
    )
    .eq("cliente_id", clienteId)
    .eq("clinica_id", clinicaId)
    .order("data_atendimento", { ascending: false })
    .limit(limite);

  if (error) throw error;

  type LinhaComRelacoes = {
    id: string;
    data_atendimento: string;
    quantidade: number;
    valor_total: number;
    status: string;
    procedimentos: { nome: string } | { nome: string }[] | null;
    profissionais: { nome: string } | { nome: string }[] | null;
  };

  // PostgREST devolve objeto ou array conforme a cardinalidade que infere.
  const nomeDe = (v: { nome: string } | { nome: string }[] | null): string | null => {
    if (!v) return null;
    return Array.isArray(v) ? (v[0]?.nome ?? null) : v.nome;
  };

  return ((data ?? []) as unknown as LinhaComRelacoes[]).map((linha) => ({
    id: linha.id,
    data_atendimento: linha.data_atendimento,
    quantidade: linha.quantidade,
    valor_total: linha.valor_total,
    status: linha.status,
    servico: nomeDe(linha.procedimentos),
    profissional: nomeDe(linha.profissionais),
  }));
}

/** Resumo agregado de um cliente, reaproveitando a mesma funcao da listagem. */
export async function resumoDoCliente(clienteId: string): Promise<ClienteComResumo | null> {
  const { supabase } = await contextoDaClinica();

  const { data, error } = await supabase.rpc("clientes_com_resumo", {
    p_busca: null,
    p_apenas_ativos: false,
    p_limite: 1,
    p_deslocamento: 0,
    p_cliente_id: clienteId,
  });

  if (error) throw error;
  return data?.[0] ?? null;
}

/** Clientes ativos para preencher o seletor do formulario de atendimento. */
export async function clientesParaSelecao(): Promise<Pick<ClienteRow, "id" | "nome">[]> {
  const { supabase, clinicaId } = await contextoDaClinica();

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome")
    .eq("clinica_id", clinicaId)
    .eq("ativo", true)
    .order("nome");

  if (error) throw error;
  return data ?? [];
}
