import "server-only";

import { redirect } from "next/navigation";

import { hojeNaClinica } from "@/lib/utils/date";
import type { Plano } from "@/lib/planos";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AssinaturaRow, ClinicaRow, UsuarioRow } from "@/types/database";

export interface SessaoClinica {
  authUserId: string;
  email: string;
  usuario: UsuarioRow;
  clinica: ClinicaRow;
  assinatura: AssinaturaRow | null;
}

export type EstadoSessao =
  /** Sem usuario autenticado. */
  | { tipo: "anonimo" }
  /** Autenticado no Supabase Auth, mas ainda sem clinica/perfil criados. */
  | { tipo: "sem-perfil"; authUserId: string; email: string; nomeSugerido: string }
  /** Autenticado e com tenant resolvido. */
  | { tipo: "completo"; sessao: SessaoClinica };

/**
 * Resolve o estado de sessao do request atual.
 *
 * Nenhum identificador vem do navegador: o clinica_id sai sempre do perfil
 * ligado ao auth.uid(), e as policies RLS refazem essa checagem no banco.
 * `cache` evita repetir as consultas dentro do mesmo render.
 */
export const getEstadoSessao = cache(async (): Promise<EstadoSessao> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return { tipo: "anonimo" };

  const metadados = user.user_metadata as { nome?: unknown } | null;
  const nomeSugerido =
    typeof metadados?.nome === "string" && metadados.nome.trim() !== ""
      ? metadados.nome
      : (user.email?.split("@")[0] ?? "");

  const semPerfil: EstadoSessao = {
    tipo: "sem-perfil",
    authUserId: user.id,
    email: user.email ?? "",
    nomeSugerido,
  };

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (usuarioError) {
    console.error("[sessão] falha ao carregar perfil", usuarioError.message);
    return semPerfil;
  }
  if (!usuario) return semPerfil;

  const [{ data: clinica, error: clinicaError }, { data: assinatura }] = await Promise.all([
    supabase.from("clinicas").select("*").eq("id", usuario.clinica_id).maybeSingle(),
    supabase.from("assinaturas").select("*").eq("clinica_id", usuario.clinica_id).maybeSingle(),
  ]);

  if (clinicaError || !clinica) {
    if (clinicaError) console.error("[sessão] falha ao carregar clínica", clinicaError.message);
    return semPerfil;
  }

  return {
    tipo: "completo",
    sessao: {
      authUserId: user.id,
      email: user.email ?? usuario.email,
      usuario,
      clinica,
      assinatura: assinatura ?? null,
    },
  };
});

export async function getSessao(): Promise<SessaoClinica | null> {
  const estado = await getEstadoSessao();
  return estado.tipo === "completo" ? estado.sessao : null;
}

/** Exige usuario autenticado com perfil e clinica resolvidos. */
export async function requireSessao(): Promise<SessaoClinica> {
  const estado = await getEstadoSessao();
  if (estado.tipo === "anonimo") redirect("/login");
  if (estado.tipo === "sem-perfil") redirect("/onboarding");
  return estado.sessao;
}

/**
 * O negocio pode usar o sistema agora?
 *
 * Espelha clinica_tem_acesso() no banco. Antes desta regra, 'trial' liberava
 * para sempre: nada nunca tirava ninguem de la, e o produto era gratuito
 * indefinidamente.
 *
 * A verificacao de verdade acontece no servidor a cada navegacao
 * (requireActiveSubscription), nao no navegador.
 */
/**
 * Nivel de acesso que vale AGORA. Espelha plano_efetivo() no banco.
 *
 * Diferente de clinica.plano, que guarda o contratado: quem parou de pagar
 * mantem 'pro' gravado e passa a valer como 'free'.
 */
export function nivelEfetivo(clinica: ClinicaRow): Plano {
  if (clinica.status === "blocked") return "free";
  if (clinica.status === "active") return clinica.plano === "pro" ? "pro" : "free";
  if (clinica.status === "trial" && dentroDoTeste(clinica)) return "trial";
  // Teste vencido, inadimplente ou cancelado caem para o gratuito - com os
  // dados intactos. Tirar o acesso a propria agenda no meio do expediente e a
  // forma mais rapida de a pessoa nao voltar.
  return "free";
}

function dentroDoTeste(clinica: ClinicaRow): boolean {
  if (!clinica.trial_termina_em) return true;
  return clinica.trial_termina_em >= hojeNaClinica(clinica.timezone);
}

export function assinaturaLiberaAcesso(clinica: ClinicaRow): boolean {
  // So o bloqueio administrativo fecha a porta. Fim de teste, inadimplencia e
  // cancelamento rebaixam para o gratuito, nao expulsam.
  return clinica.status !== "blocked";
}

/** Dias que faltam para o teste acabar. null quando nao esta em teste. */
export function diasRestantesDeTeste(clinica: ClinicaRow): number | null {
  if (clinica.status !== "trial" || !clinica.trial_termina_em) return null;
  const hoje = hojeNaClinica(clinica.timezone);
  const fim = new Date(`${clinica.trial_termina_em}T12:00:00Z`).getTime();
  const agora = new Date(`${hoje}T12:00:00Z`).getTime();
  const dias = Math.round((fim - agora) / 86_400_000);
  // Teste encerrado devolve null, nao zero: "0 dias restantes" no cabecalho
  // seria um contador parado, quando na verdade nao ha mais contagem.
  return dias > 0 ? dias : null;
}

/**
 * Gate das rotas do dashboard: autenticado + clinica existente + status de
 * assinatura que permite uso. Quem nao passa vai para /assinatura, que segue
 * acessivel justamente para regularizar a situacao.
 */
export async function requireActiveSubscription(): Promise<SessaoClinica> {
  const sessao = await requireSessao();
  if (!assinaturaLiberaAcesso(sessao.clinica)) {
    redirect("/assinatura");
  }
  return sessao;
}

/** Perfis autorizados a alterar cadastros e configuracoes da clinica. */
export function podeAdministrar(usuario: UsuarioRow): boolean {
  return usuario.role === "owner" || usuario.role === "admin";
}

export async function requireAdmin(): Promise<SessaoClinica> {
  const sessao = await requireActiveSubscription();
  if (!podeAdministrar(sessao.usuario)) {
    redirect("/dashboard");
  }
  return sessao;
}
