import { NextResponse, type NextRequest } from "next/server";

import {
  AssinaturaDoWebhookInvalidaError,
  processarEvento,
  verificarEvento,
} from "@/lib/stripe/webhooks";
import { serviceRoleDisponivel } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Stripe.
 *
 * Fluxo: confere a assinatura -> registra o evento (idempotencia) -> aplica o
 * efeito na assinatura e no status da clinica.
 *
 * O corpo e lido como texto CRU de proposito: a verificacao da assinatura e
 * feita sobre os bytes exatos que o Stripe enviou, e um request.json() os
 * reserializaria, invalidando a conferencia.
 *
 * Codigos de resposta: 400 para assinatura invalida (nao adianta reentregar),
 * 200 para processado/duplicado/ignorado, 500 apenas para falha nossa - que e
 * o unico caso em que queremos a reentrega do Stripe.
 */
export async function POST(request: NextRequest) {
  if (!serviceRoleDisponivel()) {
    console.error("[stripe.webhook] SUPABASE_SERVICE_ROLE_KEY ausente");
    return NextResponse.json({ erro: "integração indisponível" }, { status: 503 });
  }

  const corpoCru = await request.text();

  let evento;
  try {
    evento = verificarEvento(corpoCru, request.headers.get("stripe-signature"));
  } catch (erro) {
    if (erro instanceof AssinaturaDoWebhookInvalidaError) {
      console.warn("[stripe.webhook] assinatura recusada", { motivo: erro.message });
      return NextResponse.json({ erro: "assinatura inválida" }, { status: 400 });
    }
    throw erro;
  }

  try {
    const resultado = await processarEvento(evento);
    return NextResponse.json({ recebido: true, situacao: resultado.situacao }, { status: 200 });
  } catch (erro) {
    // Detalhe fica apenas no log do servidor; o corpo nao revela nada.
    console.error("[stripe.webhook] falha ao processar evento", {
      eventId: evento.id,
      tipo: evento.type,
      erro: erro instanceof Error ? erro.message : "desconhecido",
    });
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}

/** Permite conferir que a rota esta no ar sem disparar um evento. */
export function GET() {
  return NextResponse.json({ servico: "glowscale", webhook: "stripe", status: "ok" });
}
