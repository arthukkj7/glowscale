"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveSubscription } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  agendamentoSchema,
  agendamentoStatusSchema,
  agendamentoUpdateSchema,
  dataISO,
  horaHHMM,
  idUuid,
  textoOpcional,
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
    // Bloqueio e tempo indisponivel, nao trabalho: nao tem servico, valor nem
    // comissao para lancar. Sem esta guarda, concluir um almoco geraria um
    // atendimento sem procedimento e derrubaria a acao no banco.
    if (agendamento.tipo === "bloqueio" || !agendamento.procedimento_id) {
      throw new ErroDeNegocio("Um bloqueio de horário não vira atendimento.");
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

const bloqueioSchema = z
  .object({
    profissional_id: idUuid,
    data_inicial: dataISO,
    data_final: dataISO,
    hora_inicio: horaHHMM,
    hora_fim: horaHHMM,
    motivo: textoOpcional(200),
  })
  .refine((d) => d.data_final >= d.data_inicial, {
    message: "A data final deve ser igual ou posterior à inicial.",
    path: ["data_final"],
  })
  .refine((d) => d.hora_fim > d.hora_inicio, {
    message: "O horário final deve ser maior que o inicial.",
    path: ["hora_fim"],
  });

/**
 * Bloqueia um horario: almoco, folga, feriado, ferias.
 *
 * A criacao roda no banco (bloquear_horario) porque um bloqueio de duas
 * semanas sao catorze linhas, e cada uma precisa passar pela constraint de
 * sobreposicao. Fazer isso daqui seriam catorze idas ao banco, e um erro no
 * meio deixaria metade criada.
 *
 * Dias que ja tem cliente marcado sao PULADOS e devolvidos: falhar tudo porque
 * a terca tem uma cliente obrigaria a pessoa a adivinhar qual dia deu problema.
 */
export async function bloquearHorario(
  dados: unknown,
): Promise<ActionResult<{ diasBloqueados: number; diasEmConflito: string[] }>> {
  try {
    const entrada = bloqueioSchema.parse(dados);
    await requireActiveSubscription();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("bloquear_horario", {
      p_profissional_id: entrada.profissional_id,
      p_data_inicial: entrada.data_inicial,
      p_data_final: entrada.data_final,
      p_hora_inicio: entrada.hora_inicio,
      p_hora_fim: entrada.hora_fim,
      p_motivo: entrada.motivo ?? null,
    });

    if (error) throw error;

    const linha = data?.[0];
    const diasBloqueados = linha?.dias_bloqueados ?? 0;
    const diasEmConflito = linha?.dias_em_conflito ?? [];

    revalidar();

    if (diasBloqueados === 0) {
      throw new ErroDeNegocio(
        "Nenhum dia foi bloqueado: já existe compromisso nesse horário em todos eles.",
      );
    }

    const mensagem =
      diasEmConflito.length === 0
        ? diasBloqueados === 1
          ? "Horário bloqueado."
          : `${diasBloqueados} dias bloqueados.`
        : `${diasBloqueados} bloqueados. ${diasEmConflito.length} dia(s) já tinham compromisso e ficaram de fora.`;

    return sucesso({ diasBloqueados, diasEmConflito }, mensagem);
  } catch (erro) {
    return tratarErro("agenda.bloquear", erro);
  }
}
