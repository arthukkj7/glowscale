"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { clienteSchema, clienteUpdateSchema, idUuid } from "@/lib/validations";
import type { ClienteRow } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

const ROTAS_AFETADAS = ["/clientes", "/dashboard", "/atendimentos"];
function revalidar() {
  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
}

export async function criarCliente(dados: unknown): Promise<ActionResult<ClienteRow>> {
  try {
    const entrada = clienteSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    // clinica_id vem da sessao, nunca do formulario.
    const { data, error } = await supabase
      .from("clientes")
      .insert({ ...entrada, clinica_id: clinica.id })
      .select()
      .single();

    if (error) throw error;

    revalidar();
    return sucesso(data, "Cliente cadastrado.");
  } catch (erro) {
    return tratarErro("clientes.criar", erro);
  }
}

export async function atualizarCliente(dados: unknown): Promise<ActionResult<ClienteRow>> {
  try {
    const { id, ...entrada } = clienteUpdateSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clientes")
      .update(entrada)
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Cliente não encontrado.");

    revalidar();
    revalidatePath(`/clientes/${id}`);
    return sucesso(data, "Dados atualizados.");
  } catch (erro) {
    return tratarErro("clientes.atualizar", erro);
  }
}

const alternarSchema = z.object({ id: idUuid, ativo: z.boolean() });

/**
 * Arquiva ou reativa um cliente.
 *
 * Preferivel a excluir: o historico de atendimentos continua ligado a pessoa,
 * e ela some das listas e do seletor de atendimento sem levar junto o passado
 * financeiro do negocio.
 */
export async function alternarStatusDoCliente(
  dados: unknown,
): Promise<ActionResult<ClienteRow>> {
  try {
    const { id, ativo } = alternarSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clientes")
      .update({ ativo })
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Cliente não encontrado.");

    revalidar();
    revalidatePath(`/clientes/${id}`);
    return sucesso(data, ativo ? "Cliente reativado." : "Cliente arquivado.");
  } catch (erro) {
    return tratarErro("clientes.alternarStatus", erro);
  }
}

/**
 * Exclui o cadastro em definitivo.
 *
 * Os atendimentos NAO sao apagados junto: a FK desfaz so o vinculo
 * (on delete set null (cliente_id)), entao o faturamento e as comissoes ja
 * lancadas continuam de pe. Apagar o historico junto reescreveria o passado
 * financeiro do negocio por causa de uma limpeza de cadastro.
 */
export async function excluirCliente(dados: unknown): Promise<ActionResult<undefined>> {
  try {
    const { id } = z.object({ id: idUuid }).parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { error, count } = await supabase
      .from("clientes")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("clinica_id", clinica.id);

    if (error) throw error;
    if (!count) throw new ErroDeNegocio("Cliente não encontrado.");

    revalidar();
    return sucesso(undefined, "Cliente excluído. O histórico de atendimentos foi mantido.");
  } catch (erro) {
    return tratarErro("clientes.excluir", erro);
  }
}
