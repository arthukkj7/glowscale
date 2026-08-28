import "server-only";

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
  priceId: string;
}

export class StripeNaoConfiguradoError extends Error {
  constructor(oQueFalta: string) {
    super(`Integração Stripe não configurada: ${oQueFalta}.`);
    this.name = "StripeNaoConfiguradoError";
  }
}

const ler = (nome: string): string | null => process.env[nome]?.trim() || null;

/** true quando da para cobrar: precisa da chave e do preco. */
export function stripeEstaConfigurado(): boolean {
  return Boolean(ler("STRIPE_SECRET_KEY") && ler("STRIPE_PRICE_ID"));
}

export function getConfiguracaoStripe(): ConfiguracaoStripe {
  const secretKey = ler("STRIPE_SECRET_KEY");
  if (!secretKey) throw new StripeNaoConfiguradoError("defina STRIPE_SECRET_KEY");

  const priceId = ler("STRIPE_PRICE_ID");
  if (!priceId) {
    throw new StripeNaoConfiguradoError(
      "defina STRIPE_PRICE_ID com o preço recorrente mensal do plano",
    );
  }

  return { secretKey, priceId };
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
