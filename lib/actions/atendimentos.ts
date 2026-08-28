"use server";

import { revalidatePath } from "next/cache";

import { requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { atendimentoSchema, atendimentoUpdateSchema, idUuid } from "@/lib/validations";
import type { AtendimentoRow } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

const ROTAS_AFETADAS = ["/atendimentos", "/dashboard", "/financeiro"];

function revalidar() {
  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
}

/**
 * Le o percentual atual da profissional direto do banco.
 *
 * O valor NUNCA vem do formulario: se viesse, um cliente malicioso poderia
 * lancar 0% de comissao para si mesmo. Tambem confirma que a profissional
 * pertence a clinica da sessao.
 */
async function percentualVigenteDaProfissional(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicaId: string,
  profissionalId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("profissionais")
    .select("percentual_comissao")
    .eq("clinica_id", clinicaId)
    .eq("id", profissionalId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ErroDeNegocio("Profissional nao encontrada nesta clinica.");

  return data.percentual_comissao;
}

async function garantirProcedimentoDaClinica(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clinicaId: string,
  procedimentoId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("procedimentos")
    .select("id")
    .eq("clinica_id", clinicaId)
    .eq("id", procedimentoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new ErroDeNegocio("Procedimento nao encontrado nesta clinica.");
}

export async function criarAtendimento(dados: unknown): Promise<ActionResult<AtendimentoRow>> {
  try {
    const entrada = atendimentoSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const [comissaoPercentual] = await Promise.all([
      percentualVigenteDaProfissional(supabase, clinica.id, entrada.profissional_id),
      garantirProcedimentoDaClinica(supabase, clinica.id, entrada.procedimento_id),
    ]);

    // valor_total, valor_comissao e valor_clinica sao colunas geradas: o banco
    // recalcula a partir de valor_unitario, quantidade e do snapshot abaixo.
    const { data, error } = await supabase
      .from("atendimentos")
      .insert({
        clinica_id: clinica.id,
        profissional_id: entrada.profissional_id,
        procedimento_id: entrada.procedimento_id,
        data_atendimento: entrada.data_atendimento,
        quantidade: entrada.quantidade,
        valor_unitario: entrada.valor_unitario,
        comissao_percentual: comissaoPercentual,
        status: entrada.status,
        observacoes: entrada.observacoes,
      })
      .select()
      .single();

    if (error) throw error;

    revalidar();
    return sucesso(data, "Atendimento registrado.");
  } catch (erro) {
    return tratarErro("atendimentos.criar", erro);
  }
}

/**
 * Edita um atendimento preservando o snapshot de comissao original.
 * O percentual so e reescrito quando a profissional do lancamento muda -
 * nesse caso vale o percentual vigente da nova profissional.
 */
export async function atualizarAtendimento(
  dados: unknown,
): Promise<ActionResult<AtendimentoRow>> {
  try {
    const { id, ...entrada } = atendimentoUpdateSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data: atual, error: erroBusca } = await supabase
      .from("atendimentos")
      .select("profissional_id, comissao_percentual")
      .eq("clinica_id", clinica.id)
      .eq("id", id)
      .maybeSingle();

    if (erroBusca) throw erroBusca;
    if (!atual) throw new ErroDeNegocio("Atendimento nao encontrado.");

    await garantirProcedimentoDaClinica(supabase, clinica.id, entrada.procedimento_id);

    const profissionalMudou = atual.profissional_id !== entrada.profissional_id;
    const comissaoPercentual = profissionalMudou
      ? await percentualVigenteDaProfissional(supabase, clinica.id, entrada.profissional_id)
      : atual.comissao_percentual;

    const { data, error } = await supabase
      .from("atendimentos")
      .update({
        profissional_id: entrada.profissional_id,
        procedimento_id: entrada.procedimento_id,
        data_atendimento: entrada.data_atendimento,
        quantidade: entrada.quantidade,
        valor_unitario: entrada.valor_unitario,
        comissao_percentual: comissaoPercentual,
        status: entrada.status,
        observacoes: entrada.observacoes,
      })
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new ErroDeNegocio("Atendimento nao encontrado.");

    revalidar();
    return sucesso(data, "Atendimento atualizado.");
  } catch (erro) {
    return tratarErro("atendimentos.atualizar", erro);
  }
}

export async function excluirAtendimento(dados: unknown): Promise<ActionResult<null>> {
  try {
    const id = idUuid.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { error } = await supabase
      .from("atendimentos")
      .delete()
      .eq("id", id)
      .eq("clinica_id", clinica.id);

    if (error) throw error;

    revalidar();
    return sucesso(null, "Atendimento excluido.");
  } catch (erro) {
    return tratarErro("atendimentos.excluir", erro);
  }
}
