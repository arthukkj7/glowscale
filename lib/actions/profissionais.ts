"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  profissionalSchema,
  profissionalUpdateSchema,
  idUuid,
} from "@/lib/validations";
import type { ProfissionalRow } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

const alternarStatusSchema = z.object({ id: idUuid, ativo: z.boolean() });

const ROTAS_AFETADAS = ["/profissionais", "/dashboard", "/escala", "/atendimentos", "/financeiro"];

function revalidar() {
  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
}

export async function criarProfissional(
  dados: unknown,
): Promise<ActionResult<ProfissionalRow>> {
  try {
    const entrada = profissionalSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    // clinica_id vem da sessao, nunca do formulario.
    const { data, error } = await supabase
      .from("profissionais")
      .insert({ ...entrada, clinica_id: clinica.id })
      .select()
      .single();

    if (error) throw error;

    revalidar();
    return sucesso(data, "Profissional cadastrada.");
  } catch (erro) {
    return tratarErro("profissionais.criar", erro);
  }
}

export async function atualizarProfissional(
  dados: unknown,
): Promise<ActionResult<ProfissionalRow>> {
  try {
    const { id, ...entrada } = profissionalUpdateSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .update(entrada)
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Profissional não encontrada.");

    revalidar();
    return sucesso(data, "Dados atualizados.");
  } catch (erro) {
    return tratarErro("profissionais.atualizar", erro);
  }
}

export async function alternarStatusProfissional(
  dados: unknown,
): Promise<ActionResult<ProfissionalRow>> {
  try {
    const { id, ativo } = alternarStatusSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profissionais")
      .update({ ativo })
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Profissional não encontrada.");

    revalidar();
    return sucesso(data, ativo ? "Profissional ativada." : "Profissional desativada.");
  } catch (erro) {
    return tratarErro("profissionais.alternarStatus", erro);
  }
}

/**
 * Exclui a profissional somente quando nao ha atendimento vinculado.
 * Com historico, a operacao correta e desativar: apagar destruiria o
 * relatorio financeiro dos periodos anteriores.
 */
export async function excluirProfissional(dados: unknown): Promise<ActionResult<null>> {
  try {
    const id = idUuid.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { count, error: erroContagem } = await supabase
      .from("atendimentos")
      .select("id", { count: "exact", head: true })
      .eq("clinica_id", clinica.id)
      .eq("profissional_id", id);

    if (erroContagem) throw erroContagem;

    if ((count ?? 0) > 0) {
      throw new ErroDeNegocio(
        "Esta profissional possui atendimentos registrados. Desative o cadastro para preservar o histórico.",
      );
    }

    const { error } = await supabase
      .from("profissionais")
      .delete()
      .eq("id", id)
      .eq("clinica_id", clinica.id);

    if (error) throw error;

    revalidar();
    return sucesso(null, "Profissional excluida.");
  } catch (erro) {
    return tratarErro("profissionais.excluir", erro);
  }
}
