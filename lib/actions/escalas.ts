"use server";

import { revalidatePath } from "next/cache";

import { requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { escalaSchema, escalaUpdateSchema, idUuid } from "@/lib/validations";
import type { EscalaRow } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

const ROTAS_AFETADAS = ["/escala", "/dashboard"];

function revalidar() {
  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
}

/** Confirma que a profissional pertence a clinica da sessao. */
async function garantirProfissionalDaClinica(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicaId: string,
  profissionalId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("profissionais")
    .select("id")
    .eq("clinica_id", clinicaId)
    .eq("id", profissionalId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ErroDeNegocio("Profissional não encontrada nesta clínica.");
}

export async function criarEscala(dados: unknown): Promise<ActionResult<EscalaRow>> {
  try {
    const entrada = escalaSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    await garantirProfissionalDaClinica(supabase, clinica.id, entrada.profissional_id);

    const { data, error } = await supabase
      .from("escalas")
      .insert({
        clinica_id: clinica.id,
        profissional_id: entrada.profissional_id,
        data: entrada.data,
        hora_inicio: entrada.hora_inicio,
        hora_fim: entrada.hora_fim,
        observacoes: entrada.observacoes,
      })
      .select()
      .single();

    if (error) throw error;

    revalidar();
    return sucesso(data, "Turno adicionado.");
  } catch (erro) {
    return tratarErro("escalas.criar", erro);
  }
}

export async function atualizarEscala(dados: unknown): Promise<ActionResult<EscalaRow>> {
  try {
    const { id, ...entrada } = escalaUpdateSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    await garantirProfissionalDaClinica(supabase, clinica.id, entrada.profissional_id);

    const { data, error } = await supabase
      .from("escalas")
      .update({
        profissional_id: entrada.profissional_id,
        data: entrada.data,
        hora_inicio: entrada.hora_inicio,
        hora_fim: entrada.hora_fim,
        observacoes: entrada.observacoes,
      })
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Turno não encontrado.");

    revalidar();
    return sucesso(data, "Turno atualizado.");
  } catch (erro) {
    return tratarErro("escalas.atualizar", erro);
  }
}

export async function excluirEscala(dados: unknown): Promise<ActionResult<null>> {
  try {
    const id = idUuid.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { error } = await supabase
      .from("escalas")
      .delete()
      .eq("id", id)
      .eq("clinica_id", clinica.id);

    if (error) throw error;

    revalidar();
    return sucesso(null, "Turno removido.");
  } catch (erro) {
    return tratarErro("escalas.excluir", erro);
  }
}
