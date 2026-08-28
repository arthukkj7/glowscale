"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  cadastroSchema,
  loginSchema,
  recuperarSenhaSchema,
  redefinirSenhaSchema,
  textoObrigatorio,
} from "@/lib/validations";
import { createClient } from "@/lib/supabase/server";
import { ErroDeNegocio, falha, sucesso, tratarErro, type ActionResult } from "./result";
import { traduzirErroDeCadastro } from "./mensagens-auth";
import { linkDoPainel } from "@/lib/supabase/config";
import { z } from "zod";
import { telefoneOpcional } from "@/lib/validations/common";

/** URL publica da aplicacao, usada nos links enviados por e-mail. */
async function getAppUrl(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_APP_URL;
  if (configurada) return configurada.replace(/\/$/, "");

  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "http";
  return host ? `${protocolo}://${host}` : "http://localhost:3000";
}

/**
 * Mensagens de erro do Supabase Auth sao traduzidas sem revelar se o e-mail
 * existe na base (evita enumeracao de contas).
 */
function traduzirErroDeLogin(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) {
    return "E-mail ou senha incorretos.";
  }
  if (/email not confirmed/i.test(mensagem)) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  }
  if (/rate limit|too many/i.test(mensagem)) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  return "Não foi possível entrar. Verifique os dados e tente novamente.";
}

export async function entrar(dados: unknown): Promise<ActionResult<{ destino: string }>> {
  try {
    const entrada = loginSchema.parse(dados);
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: entrada.email,
      password: entrada.senha,
    });

    if (error) {
      console.warn("[auth] login recusado", { motivo: error.message });
      return falha(traduzirErroDeLogin(error.message));
    }

    revalidatePath("/", "layout");
    return sucesso({ destino: "/dashboard" });
  } catch (erro) {
    return tratarErro("auth.entrar", erro);
  }
}

export async function cadastrar(
  dados: unknown,
): Promise<ActionResult<{ destino: string; precisaConfirmarEmail: boolean }>> {
  try {
    const entrada = cadastroSchema.parse(dados);
    const supabase = await createClient();
    const appUrl = await getAppUrl();

    const { data, error } = await supabase.auth.signUp({
      email: entrada.email,
      password: entrada.senha,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?proximo=/onboarding`,
        data: { nome: entrada.nome, clinica_nome: entrada.clinicaNome },
      },
    });

    if (error) {
      console.error("[auth] falha no cadastro", {
        motivo: error.message,
        codigo: error.code,
        status: error.status,
      });
      const recusa = traduzirErroDeCadastro(error.message);
      const url = recusa.pagina ? linkDoPainel(recusa.pagina) : null;
      return falha(
        recusa.mensagem,
        undefined,
        url && recusa.rotulo ? { texto: recusa.rotulo, url } : undefined,
      );
    }

    // Sem sessao imediata => o projeto exige confirmacao de e-mail.
    if (!data.session) {
      return sucesso(
        { destino: "/login", precisaConfirmarEmail: true },
        "Conta criada. Confirme seu e-mail para continuar.",
      );
    }

    const { error: rpcError } = await supabase.rpc("criar_clinica_com_usuario", {
      p_clinica_nome: entrada.clinicaNome,
      p_usuario_nome: entrada.nome,
      p_telefone: entrada.telefone,
    });

    if (rpcError) {
      console.error("[auth] falha ao criar clínica no cadastro", rpcError.message);
      // A conta existe; o onboarding conclui o que faltou.
      return sucesso(
        { destino: "/onboarding", precisaConfirmarEmail: false },
        "Conta criada. Vamos concluir a configuracao da clínica.",
      );
    }

    revalidatePath("/", "layout");
    return sucesso({ destino: "/assinatura", precisaConfirmarEmail: false });
  } catch (erro) {
    return tratarErro("auth.cadastrar", erro);
  }
}

const onboardingSchema = z.object({
  clinicaNome: textoObrigatorio("Nome da clínica"),
  usuarioNome: textoObrigatorio("Seu nome"),
  telefone: telefoneOpcional,
});

/** Conclui a criacao de clinica + perfil para quem confirmou o e-mail depois. */
export async function concluirOnboarding(
  dados: unknown,
): Promise<ActionResult<{ destino: string }>> {
  try {
    const entrada = onboardingSchema.parse(dados);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new ErroDeNegocio("Sessão expirada. Entre novamente.");

    const { error } = await supabase.rpc("criar_clinica_com_usuario", {
      p_clinica_nome: entrada.clinicaNome,
      p_usuario_nome: entrada.usuarioNome,
      p_telefone: entrada.telefone,
    });

    if (error) throw error;

    revalidatePath("/", "layout");
    return sucesso({ destino: "/assinatura" });
  } catch (erro) {
    return tratarErro("auth.concluirOnboarding", erro);
  }
}

export async function sair(): Promise<ActionResult<{ destino: string }>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    revalidatePath("/", "layout");
    return sucesso({ destino: "/login" });
  } catch (erro) {
    return tratarErro("auth.sair", erro);
  }
}

export async function solicitarRecuperacaoDeSenha(dados: unknown): Promise<ActionResult<null>> {
  try {
    const entrada = recuperarSenhaSchema.parse(dados);
    const supabase = await createClient();
    const appUrl = await getAppUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(entrada.email, {
      redirectTo: `${appUrl}/auth/callback?proximo=/redefinir-senha`,
    });

    // Nunca revelamos se o e-mail existe: a resposta e sempre a mesma.
    if (error) {
      console.warn("[auth] recuperação de senha não enviada", { motivo: error.message });
    }

    return sucesso(
      null,
      "Se existir uma conta com este e-mail, enviamos as instruções de recuperação.",
    );
  } catch (erro) {
    return tratarErro("auth.solicitarRecuperacaoDeSenha", erro);
  }
}

export async function redefinirSenha(dados: unknown): Promise<ActionResult<{ destino: string }>> {
  try {
    const entrada = redefinirSenhaSchema.parse(dados);
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new ErroDeNegocio(
        "Link de recuperação inválido ou expirado. Solicite um novo e-mail.",
      );
    }

    const { error } = await supabase.auth.updateUser({ password: entrada.senha });
    if (error) {
      console.error("[auth] falha ao redefinir senha", error.message);
      throw new ErroDeNegocio("Não foi possível alterar a senha. Solicite um novo link.");
    }

    revalidatePath("/", "layout");
    return sucesso({ destino: "/dashboard" }, "Senha alterada com sucesso.");
  } catch (erro) {
    return tratarErro("auth.redefinirSenha", erro);
  }
}
