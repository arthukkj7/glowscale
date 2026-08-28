"use server";

import { revalidatePath } from "next/cache";

import { requireSessao } from "@/lib/auth/session";
import { PLANO_PADRAO } from "@/lib/constants";
import {
  buscarAssinaturaStripe,
  criarSessaoDeCheckout,
  criarSessaoDoPortal,
} from "@/lib/stripe/checkout";
import { stripeEstaConfigurado } from "@/lib/stripe/config";
import { interpretarStatus } from "@/lib/stripe/webhooks";
import { createAdminClient, serviceRoleDisponivel } from "@/lib/supabase/admin";
import { getAppUrl } from "@/lib/utils/app-url";
import type { AssinaturaStatus } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

/**
 * Assinatura mensal via Stripe Checkout.
 *
 * A escrita em `assinaturas` usa service role de proposito: o papel
 * `authenticated` nao tem INSERT/UPDATE nessa tabela, para que ninguem consiga
 * se auto-promover para 'active' via PostgREST e usar o sistema sem pagar.
 */

function garantirIntegracaoDisponivel(): void {
  if (!stripeEstaConfigurado()) {
    throw new ErroDeNegocio(
      "A cobrança ainda não está configurada nesta instalação. " +
        "Configure STRIPE_SECRET_KEY e STRIPE_PRICE_ID no servidor.",
    );
  }
  if (!serviceRoleDisponivel()) {
    throw new ErroDeNegocio(
      "A cobrança ainda não está configurada nesta instalação. " +
        "Configure SUPABASE_SERVICE_ROLE_KEY no servidor.",
    );
  }
}

/**
 * Cria a sessao de checkout e devolve a URL para redirecionar.
 *
 * Nao recebe parametros: quem coleta documento, endereco e cartao e a pagina
 * hospedada do Stripe. Menos campos no nosso formulario significa menos dado
 * sensivel passando por aqui.
 */
export async function iniciarCheckoutStripe(): Promise<ActionResult<{ url: string }>> {
  try {
    const { clinica, email } = await requireSessao();
    garantirIntegracaoDisponivel();

    const admin = createAdminClient();
    const appUrl = await getAppUrl();

    const { data: assinaturaAtual, error: erroLeitura } = await admin
      .from("assinaturas")
      .select("*")
      .eq("clinica_id", clinica.id)
      .maybeSingle();
    if (erroLeitura) throw erroLeitura;

    const sessao = await criarSessaoDeCheckout({
      clinicaId: clinica.id,
      clinicaNome: clinica.nome,
      email: clinica.email ?? email,
      customerId: assinaturaAtual?.stripe_customer_id ?? null,
      urlSucesso: `${appUrl}/assinatura?checkout=sucesso`,
      urlCancelamento: `${appUrl}/assinatura?checkout=cancelado`,
    });

    if (!sessao.url) {
      throw new ErroDeNegocio("O Stripe não devolveu a URL do checkout. Tente novamente.");
    }

    // Marca a intencao antes do redirect. Se o webhook chegar primeiro, ele
    // encontra a linha pronta para receber os identificadores.
    const { error: erroPersistencia } = await admin.from("assinaturas").upsert(
      {
        clinica_id: clinica.id,
        provedor: "stripe",
        status: assinaturaAtual?.status ?? "pending",
        plano: PLANO_PADRAO.slug,
        ciclo: "MONTHLY",
        forma_pagamento: "STRIPE",
        ...(assinaturaAtual?.stripe_customer_id
          ? {}
          : { stripe_customer_id: typeof sessao.customer === "string" ? sessao.customer : null }),
      },
      { onConflict: "clinica_id" },
    );
    if (erroPersistencia) throw erroPersistencia;

    revalidatePath("/assinatura");
    return sucesso({ url: sessao.url });
  } catch (erro) {
    return tratarErro("assinatura.stripe.checkout", erro);
  }
}

/**
 * Portal de faturamento do Stripe: trocar cartao, ver faturas, cancelar.
 * Sem ele, cada um desses pedidos vira trabalho manual do suporte.
 */
export async function abrirPortalStripe(): Promise<ActionResult<{ url: string }>> {
  try {
    const { clinica } = await requireSessao();
    garantirIntegracaoDisponivel();

    const admin = createAdminClient();
    const appUrl = await getAppUrl();

    const { data: assinatura, error } = await admin
      .from("assinaturas")
      .select("stripe_customer_id")
      .eq("clinica_id", clinica.id)
      .maybeSingle();
    if (error) throw error;

    if (!assinatura?.stripe_customer_id) {
      throw new ErroDeNegocio(
        "Esta clínica ainda não tem cadastro de cobrança. Assine primeiro.",
      );
    }

    const sessao = await criarSessaoDoPortal(
      assinatura.stripe_customer_id,
      `${appUrl}/assinatura`,
    );
    return sucesso({ url: sessao.url });
  } catch (erro) {
    return tratarErro("assinatura.stripe.portal", erro);
  }
}

/**
 * Reconsulta o Stripe e sincroniza o estado local.
 * Rede de seguranca para quando um webhook nao chega.
 */
export async function sincronizarAssinaturaStripe(): Promise<
  ActionResult<{ status: AssinaturaStatus }>
> {
  try {
    const { clinica } = await requireSessao();
    garantirIntegracaoDisponivel();

    const admin = createAdminClient();

    const { data: assinatura, error } = await admin
      .from("assinaturas")
      .select("*")
      .eq("clinica_id", clinica.id)
      .maybeSingle();
    if (error) throw error;

    if (!assinatura?.stripe_subscription_id) {
      throw new ErroDeNegocio(
        "Nenhuma assinatura foi concluída no Stripe para esta clínica ainda.",
      );
    }

    const remota = await buscarAssinaturaStripe(assinatura.stripe_subscription_id);
    const efeito = interpretarStatus(remota.status);

    await admin
      .from("assinaturas")
      .update({ status: efeito.statusAssinatura })
      .eq("clinica_id", clinica.id);

    if (efeito.statusClinica) {
      await admin
        .from("clinicas")
        .update({ status: efeito.statusClinica })
        .eq("id", clinica.id);
    }

    revalidatePath("/assinatura");
    revalidatePath("/", "layout");

    return sucesso({ status: efeito.statusAssinatura }, "Situação da assinatura atualizada.");
  } catch (erro) {
    return tratarErro("assinatura.stripe.sincronizar", erro);
  }
}
