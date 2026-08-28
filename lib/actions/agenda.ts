"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  agendamentoSchema,
  agendamentoStatusSchema,
  agendamentoUpdateSchema,
  idUuid,
} from "@/lib/validations";
import type { AgendamentoRow } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

const ROTAS_AFETADAS = ["/agenda", "/dashboard", "/clientes", "/atendimentos"];
function revalidar() {
  for (const rota of ROTAS_AFETADAS) revalidatePath(rota);
}

/**
 * Traduz a recusa do banco quando o horario ja esta ocupado.
 *
 * A checagem de conflito vive no banco (constraint EXCLUDE), nao aqui: duas
 * recepcionistas marcando ao mesmo tempo passariam por qualquer verificacao do
 * tipo "consulta antes, insere depois". O preco e que o erro chega como codigo
 * do Postgres, e cabe a esta funcao transforma-lo em portugues.
 */
function ehConflitoDeHorario(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string } | null;
  if (!e) return false;
  // 23P01 = exclusion_violation
  return e.code === "23P01" || Boolean(e.message?.includes("agendamentos_sem_sobreposicao"));
}

const MENSAGEM_DE_CONFLITO =
  "Esta profissional já tem outro compromisso nesse horário. " +
  "Escolha outro horário ou outra profissional.";

export async function criarAgendamento(
  dados: unknown,
): Promise<ActionResult<AgendamentoRow>> {
  try {
    const entrada = agendamentoSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    // clinica_id vem da sessao. As FKs compostas garantem, no banco, que
    // profissional, servico e cliente pertencem todos a este negocio.
    const { data, error } = await supabase
      .from("agendamentos")
      .insert({ ...entrada, cliente_id: entrada.cliente_id ?? null, clinica_id: clinica.id })
      .select()
      .single();

    if (error) {
      if (ehConflitoDeHorario(error)) throw new ErroDeNegocio(MENSAGEM_DE_CONFLITO);
      throw error;
    }

    revalidar();
    return sucesso(data, "Agendamento criado.");
  } catch (erro) {
    return tratarErro("agenda.criar", erro);
  }
}

/** Edicao completa. Remarcar e so mudar data/hora por aqui. */
export async function atualizarAgendamento(
  dados: unknown,
): Promise<ActionResult<AgendamentoRow>> {
  try {
    const { id, ...entrada } = agendamentoUpdateSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("agendamentos")
      .update({ ...entrada, cliente_id: entrada.cliente_id ?? null })
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) {
      if (ehConflitoDeHorario(error)) throw new ErroDeNegocio(MENSAGEM_DE_CONFLITO);
      throw error;
    }
    if (!data) throw new ErroDeNegocio("Agendamento não encontrado.");

    revalidar();
    return sucesso(data, "Agendamento atualizado.");
  } catch (erro) {
    return tratarErro("agenda.atualizar", erro);
  }
}

/** Confirmar, cancelar ou marcar falta. */
export async function alterarStatusDoAgendamento(
  dados: unknown,
): Promise<ActionResult<AgendamentoRow>> {
  try {
    const { id, status } = agendamentoStatusSchema.parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    if (status === "concluido") {
      throw new ErroDeNegocio(
        "Para concluir, use 'Lançar atendimento' - é o que gera a comissão.",
      );
    }

    const { data, error } = await supabase
      .from("agendamentos")
      .update({ status })
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .select()
      .maybeSingle();

    if (error) {
      // Reabrir um cancelado pode esbarrar em outro que ocupou a vaga.
      if (ehConflitoDeHorario(error)) throw new ErroDeNegocio(MENSAGEM_DE_CONFLITO);
      throw error;
    }
    if (!data) throw new ErroDeNegocio("Agendamento não encontrado.");

    revalidar();
    return sucesso(data, "Situação atualizada.");
  } catch (erro) {
    return tratarErro("agenda.status", erro);
  }
}

/**
 * Conclui o agendamento e lanca o atendimento correspondente.
 *
 * E a ponte entre a agenda e o dinheiro: sem ela, quem usa a agenda teria de
 * digitar o mesmo atendimento duas vezes.
 *
 * O percentual de comissao e lido AGORA e gravado no atendimento, seguindo a
 * mesma regra do lancamento manual: alterar a comissao da profissional depois
 * nao reescreve o que ja foi lancado.
 *
 * atendimento_id guarda o vinculo, e concluir de novo e recusado - sem isso,
 * dois cliques gerariam comissao em dobro.
 */
export async function concluirAgendamento(
  dados: unknown,
): Promise<ActionResult<{ atendimentoId: string }>> {
  try {
    const { id, valor_unitario } = z
      .object({
        id: idUuid,
        // Permite ajustar o valor no fechamento: o preco combinado nem sempre
        // e o de tabela.
        valor_unitario: z.number().min(0).max(9_999_999).optional(),
      })
      .parse(dados);

    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { data: agendamento, error: erroLeitura } = await supabase
      .from("agendamentos")
      .select("*")
      .eq("id", id)
      .eq("clinica_id", clinica.id)
      .maybeSingle();

    if (erroLeitura) throw erroLeitura;
    if (!agendamento) throw new ErroDeNegocio("Agendamento não encontrado.");
    if (agendamento.atendimento_id) {
      throw new ErroDeNegocio("Este agendamento já foi lançado como atendimento.");
    }
    if (agendamento.status === "cancelado" || agendamento.status === "faltou") {
      throw new ErroDeNegocio(
        "Este agendamento está cancelado. Reabra antes de lançar o atendimento.",
      );
    }

    const [{ data: profissional }, { data: servico }] = await Promise.all([
      supabase
        .from("profissionais")
        .select("percentual_comissao")
        .eq("id", agendamento.profissional_id)
        .eq("clinica_id", clinica.id)
        .maybeSingle(),
      supabase
        .from("procedimentos")
        .select("valor")
        .eq("id", agendamento.procedimento_id)
        .eq("clinica_id", clinica.id)
        .maybeSingle(),
    ]);

    if (!profissional) throw new ErroDeNegocio("Profissional não encontrada.");
    if (!servico) throw new ErroDeNegocio("Serviço não encontrado.");

    const { data: atendimento, error: erroAtendimento } = await supabase
      .from("atendimentos")
      .insert({
        clinica_id: clinica.id,
        cliente_id: agendamento.cliente_id,
        profissional_id: agendamento.profissional_id,
        procedimento_id: agendamento.procedimento_id,
        data_atendimento: agendamento.data,
        quantidade: 1,
        valor_unitario: valor_unitario ?? servico.valor,
        comissao_percentual: profissional.percentual_comissao,
        status: "realizado",
      })
      .select("id")
      .single();

    if (erroAtendimento) throw erroAtendimento;

    const { error: erroVinculo } = await supabase
      .from("agendamentos")
      .update({ status: "concluido", atendimento_id: atendimento.id })
      .eq("id", id)
      .eq("clinica_id", clinica.id);

    if (erroVinculo) throw erroVinculo;

    revalidar();
    revalidatePath("/financeiro");
    return sucesso(
      { atendimentoId: atendimento.id },
      "Atendimento lançado e comissão calculada.",
    );
  } catch (erro) {
    return tratarErro("agenda.concluir", erro);
  }
}

export async function excluirAgendamento(dados: unknown): Promise<ActionResult<undefined>> {
  try {
    const { id } = z.object({ id: idUuid }).parse(dados);
    const { clinica } = await requireActiveSubscription();
    const supabase = await createClient();

    const { error, count } = await supabase
      .from("agendamentos")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("clinica_id", clinica.id);

    if (error) throw error;
    if (!count) throw new ErroDeNegocio("Agendamento não encontrado.");

    revalidar();
    return sucesso(undefined, "Agendamento removido.");
  } catch (erro) {
    return tratarErro("agenda.excluir", erro);
  }
}
