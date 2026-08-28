import "server-only";

import { PLANOS, PLANOS_PAGOS, type PlanoPago } from "@/lib/planos";

/**
 * Configuracao da integracao Stripe.
 *
 * A secret key vive apenas no servidor (process.env.STRIPE_SECRET_KEY) e nunca
 * e logada. Nao existe NEXT_PUBLIC_ para credencial do Stripe: o fluxo usa
 * Stripe Checkout hospedado, entao o browser so recebe uma URL de redirect -
 * nenhum dado de cartao passa pela nossa aplicacao, e nao ha chave publicavel
 * a distribuir.
 */

export interface ConfiguracaoStripe {
  secretKey: string;
}

export class StripeNaoConfiguradoError extends Error {
  constructor(oQueFalta: string) {
    super(`Integração Stripe não configurada: ${oQueFalta}.`);
    this.name = "StripeNaoConfiguradoError";
  }
}

const ler = (nome: string): string | null => process.env[nome]?.trim() || null;

/**
 * true quando da para cobrar: precisa da chave e de ao menos um preco.
 *
 * "Ao menos um" e nao "os tres" de proposito: uma instalacao que so queira
 * vender o Studio deve funcionar, mostrando so o que tem preco configurado, em
 * vez de recusar tudo por falta de um plano que ninguem vai oferecer.
 */
export function stripeEstaConfigurado(): boolean {
  if (!ler("STRIPE_SECRET_KEY")) return false;
  return PLANOS_PAGOS.some((p) => ler(PLANOS[p].variavelDoPreco) !== null);
}

export function getConfiguracaoStripe(): ConfiguracaoStripe {
  const secretKey = ler("STRIPE_SECRET_KEY");
  if (!secretKey) throw new StripeNaoConfiguradoError("defina STRIPE_SECRET_KEY");
  return { secretKey };
}

/** price_... do plano, ou null quando aquele plano nao esta a venda aqui. */
export function precoDoPlano(plano: PlanoPago): string | null {
  return ler(PLANOS[plano].variavelDoPreco);
}

/** Planos efetivamente a venda nesta instalacao. */
export function planosDisponiveis(): PlanoPago[] {
  return PLANOS_PAGOS.filter((p) => precoDoPlano(p) !== null);
}

/** Descobre o plano a partir do price_... que voltou do Stripe. */
export function planoDoPreco(priceId: string): PlanoPago | null {
  return PLANOS_PAGOS.find((p) => precoDoPlano(p) === priceId) ?? null;
}

/** Segredo da assinatura do webhook (whsec_...). */
export function getWebhookSecret(): string | null {
  return ler("STRIPE_WEBHOOK_SECRET");
}

/**
 * true quando a chave e de producao.
 *
 * Serve para avisar na interface que uma cobranca sera real. Uma chave de teste
 * comeca com sk_test_; qualquer outra coisa e tratada como producao, porque
 * errar para o lado cauteloso aqui custa um aviso a mais, e errar para o outro
 * cobra de verdade sem avisar.
 */
export function stripeEmProducao(): boolean {
  const chave = ler("STRIPE_SECRET_KEY");
  if (!chave) return false;
  return !chave.startsWith("sk_test_") && !chave.startsWith("rk_test_");
}
