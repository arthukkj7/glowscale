"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { idUuid, procedimentoSchema, procedimentoUpdateSchema } from "@/lib/validations";
import type { ProcedimentoRow } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

const alternarStatusSchema = z.object({ id: idUuid, ativo: z.boolean() });

const ROTAS_AFETADAS = ["/procedimentos", "/dashboard", "/atendimentos", "/financeiro"];

function revalidar() {
  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
}

export async function criarProcedimento(dados: unknown): Promise<ActionResult<ProcedimentoRow>> {
  try {
    const entrada = procedimentoSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("procedimentos")
      .insert({ ...entrada, clinica_id: clinica.id })
      .select()
      .single();

    if (error) throw error;

    revalidar();
    return sucesso(data, "Procedimento cadastrado.");
  } catch (erro) {
    return tratarErro("procedimentos.criar", erro);
  }
}

export async function atualizarProcedimento(
  dados: unknown,
): Promise<ActionResult<ProcedimentoRow>> {
  try {
    const { id, ...entrada } = procedimentoUpdateSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("procedimentos")
      .update(entrada)
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Procedimento nao encontrado.");

    revalidar();
    return sucesso(data, "Procedimento atualizado.");
  } catch (erro) {
    return tratarErro("procedimentos.atualizar", erro);
  }
}

export async function alternarStatusProcedimento(
  dados: unknown,
): Promise<ActionResult<ProcedimentoRow>> {
  try {
    const { id, ativo } = alternarStatusSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("procedimentos")
      .update({ ativo })
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Procedimento nao encontrado.");

    revalidar();
    return sucesso(data, ativo ? "Procedimento ativado." : "Procedimento desativado.");
  } catch (erro) {
    return tratarErro("procedimentos.alternarStatus", erro);
  }
}

/**
 * So permite excluir procedimento sem historico. Com atendimentos vinculados,
 * a desativacao preserva os relatorios ja fechados.
 */
export async function excluirProcedimento(dados: unknown): Promise<ActionResult<null>> {
  try {
    const id = idUuid.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { count, error: erroContagem } = await supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinica.id)
      .eq("procedimento_id", id);

    if (erroContagem) throw erroContagem;

    if ((count ?? 0) > 0) {
      throw new ErroDeNegocio(
        "Este procedimento possui atendimentos registrados. Desative o cadastro para preservar o historico.",
      );
    }

    const { error } = await supabase
      .from("procedimentos")
      .delete()
      .eq("id", id)
      .eq("clinica_id", clinica.id);

    if (error) throw error;

    revalidar();
    return sucesso(null, "Procedimento excluido.");
  } catch (erro) {
    return tratarErro("procedimentos.excluir", erro);
  }
}
