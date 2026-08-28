import "server-only";

import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AssinaturaStatus, ClinicaStatus } from "@/types/database";
import { ehPlanoPago, type PlanoPago } from "@/lib/planos";
import { getStripe } from "./client";
import { getWebhookSecret, planoDoPreco } from "./config";

/**
 * Processamento dos webhooks do Stripe.
 *
 * Tres garantias, as mesmas do webhook do Asaas:
 *  1. autenticidade - a assinatura do header `stripe-signature` e conferida
 *     contra STRIPE_WEBHOOK_SECRET pelo proprio SDK, que faz a comparacao em
 *     tempo constante e recusa payloads fora da janela de tolerancia (replay);
 *  2. idempotencia - o id do evento e gravado em stripe_webhook_eventos com
 *     unique constraint, entao reentregas nao reprocessam nada;
 *  3. minimo privilegio - a escrita usa service role porque nao existe sessao
 *     no request, e sempre com o clinica_id resolvido no servidor.
 */

export class AssinaturaDoWebhookInvalidaError extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "AssinaturaDoWebhookInvalidaError";
  }
}

/**
 * Confere a assinatura e devolve o evento tipado.
 *
 * Recebe o corpo CRU: qualquer reserializacao (JSON.parse seguido de
 * stringify) muda bytes e invalida a assinatura.
 */
export function verificarEvento(corpoCru: string, assinatura: string | null): Stripe.Event {
  const segredo = getWebhookSecret();
  if (!segredo) {
    // Sem segredo nao ha como distinguir o Stripe de qualquer um que conheca a
    // URL. Recusar e a unica resposta correta.
    throw new AssinaturaDoWebhookInvalidaError("STRIPE_WEBHOOK_SECRET não configurado");
  }
  if (!assinatura) {
    throw new AssinaturaDoWebhookInvalidaError("header stripe-signature ausente");
  }

  try {
    return getStripe().webhooks.constructEvent(corpoCru, assinatura, segredo);
  } catch (erro) {
    throw new AssinaturaDoWebhookInvalidaError(
      erro instanceof Error ? erro.message : "assinatura inválida",
    );
  }
}

export interface EfeitoDoEvento {
  statusAssinatura: AssinaturaStatus;
  /** null quando o evento nao deve mexer no acesso da clinica. */
  statusClinica: ClinicaStatus | null;
}

/**
 * Traduz o status da assinatura no Stripe para o estado local.
 *
 * `incomplete` merece atencao: e o estado de quem comecou o checkout e ainda
 * nao concluiu. Derrubar o acesso nesse momento tiraria do ar uma clinica que
 * esta em periodo de teste e apenas comecou a assinar - por isso statusClinica
 * fica null e o acesso permanece como estava.
 */
export function interpretarStatus(status: Stripe.Subscription.Status): EfeitoDoEvento {
  switch (status) {
    case "active":
      return { statusAssinatura: "active", statusClinica: "active" };
    case "trialing":
      return { statusAssinatura: "trial", statusClinica: "trial" };
    case "past_due":
    case "unpaid":
    case "paused":
      return { statusAssinatura: "past_due", statusClinica: "past_due" };
    case "canceled":
      return { statusAssinatura: "canceled", statusClinica: "canceled" };
    case "incomplete_expired":
      return { statusAssinatura: "expired", statusClinica: "canceled" };
    case "incomplete":
      return { statusAssinatura: "pending", statusClinica: null };
    default:
      return { statusAssinatura: "pending", statusClinica: null };
  }
}

export type ResultadoDoWebhook =
  | { situacao: "processado"; clinicaId: string }
  | { situacao: "duplicado" }
  | { situacao: "ignorado"; motivo: string };

/** Dados extraidos do evento, ja normalizados. */
interface DadosDoEvento {
  clinicaId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  status: Stripe.Subscription.Status | null;
  /** Plano contratado, quando o evento permite identifica-lo. */
  plano: PlanoPago | null;
}

const comoId = (valor: string | { id: string } | null | undefined): string | null => {
  if (!valor) return null;
  return typeof valor === "string" ? valor : valor.id;
};

/**
 * Extrai o que interessa de cada tipo de evento.
 *
 * Eventos fora desta lista sao registrados e ignorados: o Stripe entrega
 * dezenas de tipos, e reagir a um que nao entendemos e pior do que nao reagir.
 */
export function extrairDados(evento: Stripe.Event): DadosDoEvento | null {
  switch (evento.type) {
    case "checkout.session.completed": {
      const sessao = evento.data.object as Stripe.Checkout.Session;
      const doMetadata = sessao.metadata?.plano;
      return {
        clinicaId: sessao.client_reference_id ?? sessao.metadata?.clinica_id ?? null,
        customerId: comoId(sessao.customer),
        subscriptionId: comoId(sessao.subscription),
        // A sessao nao carrega o status da assinatura; o evento
        // customer.subscription.* que vem junto e quem define isso.
        status: null,
        plano: doMetadata && ehPlanoPago(doMetadata) ? doMetadata : null,
      };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const assinatura = evento.data.object as Stripe.Subscription;

      // O plano sai do preco realmente cobrado, nao do metadata: se a pessoa
      // trocar de plano pelo portal do Stripe, o metadata continua com o
      // antigo e o preco ja e o novo. O preco e quem diz a verdade.
      const priceId = assinatura.items?.data?.[0]?.price?.id ?? null;
      const doPreco = priceId ? planoDoPreco(priceId) : null;
      const doMetadata = assinatura.metadata?.plano;

      return {
        clinicaId: assinatura.metadata?.clinica_id ?? null,
        customerId: comoId(assinatura.customer),
        subscriptionId: assinatura.id,
        // Um evento "deleted" pode chegar com status ainda 'active' no corpo;
        // o que ele significa e cancelamento.
        status: evento.type === "customer.subscription.deleted" ? "canceled" : assinatura.status,
        plano: doPreco ?? (doMetadata && ehPlanoPago(doMetadata) ? doMetadata : null),
      };
    }

    case "invoice.paid":
    case "invoice.payment_failed": {
      const fatura = evento.data.object as Stripe.Invoice;

      // A fatura nao tem mais `subscription` no topo: desde a reformulacao do
      // objeto, ela aponta para quem a gerou atraves de `parent`. Ler o campo
      // antigo compila (o tipo e amplo) e devolve undefined em runtime, entao
      // a origem da fatura se perderia silenciosamente.
      const detalhes = fatura.parent?.subscription_details ?? null;

      return {
        // `subscription_details.metadata` e um retrato do metadata da
        // assinatura no momento da fatura - e ali que o nosso clinica_id esta.
        clinicaId: detalhes?.metadata?.clinica_id ?? fatura.metadata?.clinica_id ?? null,
        customerId: comoId(fatura.customer),
        subscriptionId: comoId(detalhes?.subscription ?? null),
        status: evento.type === "invoice.paid" ? "active" : "past_due",
        plano: null,
      };
    }

    default:
      return null;
  }
}

/** Descobre a clinica a partir dos identificadores presentes no evento. */
async function localizarClinica(
  admin: ReturnType<typeof createAdminClient>,
  dados: DadosDoEvento,
): Promise<string | null> {
  // 1. O caminho confiavel: nos mesmos gravamos o clinica_id no metadata na
  //    criacao da sessao, entao ele volta intacto.
  if (dados.clinicaId) {
    const { data } = await admin
      .from("clinicas")
      .select("id")
      .eq("id", dados.clinicaId)
      .maybeSingle();
    if (data) return data.id;
  }

  if (dados.subscriptionId) {
    const { data } = await admin
      .from("assinaturas")
      .select("clinica_id")
      .eq("stripe_subscription_id", dados.subscriptionId)
      .maybeSingle();
    if (data) return data.clinica_id;
  }

  if (dados.customerId) {
    const { data } = await admin
      .from("assinaturas")
      .select("clinica_id")
      .eq("stripe_customer_id", dados.customerId)
      .maybeSingle();
    if (data) return data.clinica_id;
  }

  return null;
}

export async function processarEvento(evento: Stripe.Event): Promise<ResultadoDoWebhook> {
  const admin = createAdminClient();

  // 1. Idempotencia antes de qualquer efeito: o unique em event_id barra a
  //    reentrega, que o Stripe faz com frequencia por design.
  const { error: erroRegistro } = await admin.from("stripe_webhook_eventos").insert({
    event_id: evento.id,
    event_type: evento.type,
    payload: JSON.parse(JSON.stringify(evento)),
  });

  if (erroRegistro) {
    if (erroRegistro.code === "23505") return { situacao: "duplicado" };
    throw erroRegistro;
  }

  const dados = extrairDados(evento);
  if (!dados) return { situacao: "ignorado", motivo: "evento sem efeito" };

  const clinicaId = await localizarClinica(admin, dados);
  if (!clinicaId) {
    console.warn("[stripe.webhook] evento sem clínica correspondente", {
      tipo: evento.type,
      eventId: evento.id,
    });
    return { situacao: "ignorado", motivo: "clínica não encontrada" };
  }

  // 2. Vinculo dos identificadores. Acontece mesmo sem mudanca de status,
  //    porque o checkout.session.completed e o unico evento que traz os dois
  //    ids juntos - e sem eles os proximos eventos nao acham a clinica.
  const vinculo: Record<string, string> = { provedor: "stripe" };
  if (dados.customerId) vinculo.stripe_customer_id = dados.customerId;
  if (dados.subscriptionId) vinculo.stripe_subscription_id = dados.subscriptionId;
  if (dados.plano) vinculo.plano = dados.plano;

  const efeito = dados.status ? interpretarStatus(dados.status) : null;

  const { error: erroAssinatura } = await admin
    .from("assinaturas")
    .update({
      ...vinculo,
      ...(efeito ? { status: efeito.statusAssinatura } : {}),
    })
    .eq("clinica_id", clinicaId);

  if (erroAssinatura) throw erroAssinatura;

  // O plano do NEGOCIO e o que os triggers de limite consultam. Sem gravar
  // aqui, alguem pagaria pelo Scale e continuaria travado no limite do Solo.
  const mudancasNaClinica: { status?: ClinicaStatus; plano?: PlanoPago } = {};
  if (efeito?.statusClinica) mudancasNaClinica.status = efeito.statusClinica;
  if (dados.plano) mudancasNaClinica.plano = dados.plano;

  if (Object.keys(mudancasNaClinica).length > 0) {
    const { error: erroClinica } = await admin
      .from("clinicas")
      .update(mudancasNaClinica)
      .eq("id", clinicaId);
    if (erroClinica) throw erroClinica;
  }

  console.info("[stripe.webhook] evento aplicado", {
    tipo: evento.type,
    eventId: evento.id,
    statusClinica: efeito?.statusClinica ?? "inalterado",
  });

  return { situacao: "processado", clinicaId };
}
