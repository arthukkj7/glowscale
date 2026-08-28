import "server-only";

import { timingSafeEqual } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import type { AssinaturaStatus, ClinicaStatus } from "@/types/database";
import { getWebhookToken } from "./config";
import type { EventoWebhookAsaas } from "./types";

/**
 * Processamento dos webhooks do Asaas.
 *
 * Tres garantias:
 *  1. autenticidade - o header `asaas-access-token` precisa bater com
 *     ASAAS_WEBHOOK_TOKEN (comparacao em tempo constante);
 *  2. idempotencia - o id do evento e gravado em asaas_webhook_eventos com
 *     unique constraint, entao reentregas nao reprocessam nada;
 *  3. minimo privilegio - a escrita usa service role porque nao existe sessao
 *     de usuario no request, e sempre com o clinica_id resolvido no servidor.
 */

/** Comparacao em tempo constante, resistente a timing attack. */
export function tokenValido(tokenRecebido: string | null): boolean {
  const esperado = getWebhookToken();
  if (!esperado) {
    console.error("[asaas.webhook] ASAAS_WEBHOOK_TOKEN não configurado: evento recusado");
    return false;
  }
  if (!tokenRecebido) return false;

  const a = Buffer.from(tokenRecebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface EfeitoDoEvento {
  statusAssinatura: AssinaturaStatus;
  statusClinica: ClinicaStatus;
}

/**
 * Traducao dos eventos do Asaas para o estado local.
 * Eventos sem efeito de status (criacao/atualizacao de cobranca) devolvem null
 * e sao apenas registrados.
 */
export function interpretarEvento(evento: string): EfeitoDoEvento | null {
  switch (evento) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
    case "PAYMENT_RECEIVED_IN_CASH":
      return { statusAssinatura: "active", statusClinica: "active" };

    case "PAYMENT_OVERDUE":
    case "PAYMENT_REFUNDED":
    case "PAYMENT_CHARGEBACK_REQUESTED":
    case "PAYMENT_CHARGEBACK_DISPUTE":
      return { statusAssinatura: "past_due", statusClinica: "past_due" };

    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED":
      return { statusAssinatura: "canceled", statusClinica: "canceled" };

    default:
      return null;
  }
}

export type ResultadoDoWebhook =
  | { situacao: "processado"; clinicaId: string }
  | { situacao: "duplicado" }
  | { situacao: "ignorado"; motivo: string };

/** Descobre a clinica a partir dos identificadores presentes no evento. */
async function localizarClinica(
  admin: ReturnType<typeof createAdminClient>,
  evento: EventoWebhookAsaas,
): Promise<string | null> {
  const subscriptionId = evento.subscription?.id ?? evento.payment?.subscription ?? null;
  const customerId = evento.subscription?.customer ?? evento.payment?.customer ?? null;
  const referencia =
    evento.subscription?.externalReference ?? evento.payment?.externalReference ?? null;

  if (subscriptionId) {
    const { data } = await admin
      .from("assinaturas")
      .select("clinica_id")
      .eq("asaas_subscription_id", subscriptionId)
      .maybeSingle();
    if (data) return data.clinica_id;
  }

  if (customerId) {
    const { data } = await admin
      .from("assinaturas")
      .select("clinica_id")
      .eq("asaas_customer_id", customerId)
      .maybeSingle();
    if (data) return data.clinica_id;
  }

  // externalReference guarda o id da clinica, definido por nos no checkout.
  if (referencia) {
    const { data } = await admin
      .from("clinicas")
      .select("id")
      .eq("id", referencia)
      .maybeSingle();
    if (data) return data.id;
  }

  return null;
}

export async function processarEvento(evento: EventoWebhookAsaas): Promise<ResultadoDoWebhook> {
  const admin = createAdminClient();

  // 1. Idempotencia: o unique em event_id barra reentregas do mesmo evento.
  const { error: erroRegistro } = await admin.from("asaas_webhook_eventos").insert({
    event_id: evento.id,
    event_type: evento.event,
    payload: JSON.parse(JSON.stringify(evento)),
  });

  if (erroRegistro) {
    if (erroRegistro.code === "23505") {
      return { situacao: "duplicado" };
    }
    throw erroRegistro;
  }

  // 2. Efeito do evento sobre o estado local.
  const efeito = interpretarEvento(evento.event);
  if (!efeito) {
    return { situacao: "ignorado", motivo: "evento sem efeito de status" };
  }

  const clinicaId = await localizarClinica(admin, evento);
  if (!clinicaId) {
    console.warn("[asaas.webhook] evento sem clínica correspondente", {
      evento: evento.event,
      eventId: evento.id,
    });
    return { situacao: "ignorado", motivo: "clínica não encontrada" };
  }

  const subscriptionId = evento.subscription?.id ?? evento.payment?.subscription ?? null;
  const customerId = evento.subscription?.customer ?? evento.payment?.customer ?? null;

  const { error: erroAssinatura } = await admin
    .from("assinaturas")
    .update({
      status: efeito.statusAssinatura,
      ...(subscriptionId ? { asaas_subscription_id: subscriptionId } : {}),
      ...(customerId ? { asaas_customer_id: customerId } : {}),
    })
    .eq("clinica_id", clinicaId);

  if (erroAssinatura) throw erroAssinatura;

  const { error: erroClinica } = await admin
    .from("clinicas")
    .update({ status: efeito.statusClinica })
    .eq("id", clinicaId);

  if (erroClinica) throw erroClinica;

  console.info("[asaas.webhook] evento aplicado", {
    evento: evento.event,
    eventId: evento.id,
    statusClinica: efeito.statusClinica,
  });

  return { situacao: "processado", clinicaId };
}
