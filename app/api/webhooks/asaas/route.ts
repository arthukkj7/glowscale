import { NextResponse, type NextRequest } from "next/server";

import { processarEvento, tokenValido } from "@/lib/asaas/webhooks";
import type { EventoWebhookAsaas } from "@/lib/asaas/types";
import { serviceRoleDisponivel } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Asaas.
 *
 * Fluxo: valida o token -> registra o evento (idempotencia) -> aplica o efeito
 * na assinatura e no status da clinica.
 *
 * Sempre responde 200 para eventos autenticados e ja processados, para o Asaas
 * nao ficar reenfileirando entrega. Erros internos respondem 500 para que a
 * reentrega aconteca.
 */
export async function POST(request: NextRequest) {
  if (!tokenValido(request.headers.get("asaas-access-token"))) {
    console.warn("[asaas.webhook] token inválido ou ausente");
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  if (!serviceRoleDisponivel()) {
    console.error("[asaas.webhook] SUPABASE_SERVICE_ROLE_KEY ausente");
    return NextResponse.json({ erro: "integração indisponível" }, { status: 503 });
  }

  let evento: EventoWebhookAsaas;
  try {
    evento = (await request.json()) as EventoWebhookAsaas;
  } catch {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  if (!evento?.id || !evento?.event) {
    return NextResponse.json({ erro: "evento sem id ou tipo" }, { status: 400 });
  }

  try {
    const resultado = await processarEvento(evento);
    return NextResponse.json({ recebido: true, situacao: resultado.situacao }, { status: 200 });
  } catch (erro) {
    // Detalhe fica apenas no log do servidor; o corpo nao revela nada.
    console.error("[asaas.webhook] falha ao processar evento", {
      eventId: evento.id,
      tipo: evento.event,
      erro: erro instanceof Error ? erro.message : "desconhecido",
    });
    return NextResponse.json({ erro: "falha ao processar" }, { status: 500 });
  }
}

/** O painel do Asaas valida a URL antes de ativar o webhook. */
export function GET() {
  return NextResponse.json({ servico: "glowscale", webhook: "asaas", status: "ok" });
}
