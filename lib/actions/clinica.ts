"use server";

import { revalidatePath } from "next/cache";

import { podeAdministrar, requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { clinicaSchema } from "@/lib/validations";
import type { ClinicaRow } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

/**
 * Atualiza os dados cadastrais da clinica.
 *
 * O campo `status` nao aparece aqui de proposito: o privilegio de UPDATE do
 * papel `authenticated` e concedido apenas nas colunas de cadastro, entao nem
 * uma chamada direta ao PostgREST consegue mudar o status da assinatura.
 */
export async function atualizarClinica(dados: unknown): Promise<ActionResult<ClinicaRow>> {
  try {
    const entrada = clinicaSchema.parse(dados);
    const { clinica, usuario } = await requireActiveSubscription();

    if (!podeAdministrar(usuario)) {
      throw new ErroDeNegocio("Voce nao tem permissao para alterar os dados da clinica.");
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("clinicas")
      .update(entrada)
      .eq("id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Clinica nao encontrada.");

    revalidatePath("/configuracoes");
    revalidatePath("/", "layout");
    return sucesso(data, "Dados da clinica atualizados.");
  } catch (erro) {
    return tratarErro("clinica.atualizar", erro);
  }
}
