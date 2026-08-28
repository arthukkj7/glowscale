import "server-only";

import type Stripe from "stripe";

import { getStripe } from "./client";
import { getConfiguracaoStripe } from "./config";

/**
 * Checkout e portal do cliente.
 *
 * O fluxo e o Stripe Checkout hospedado: a aplicacao cria a sessao e redireciona.
 * Nenhum dado de cartao encosta no nosso servidor, o que mantem a instalacao
 * fora do escopo de PCI e nos poupa de guardar qualquer coisa sensivel.
 */

export interface DadosDaSessao {
  clinicaId: string;
  clinicaNome: string;
  email: string;
  /** Reaproveitado quando a clinica ja tem cadastro no Stripe. */
  customerId?: string | null;
  urlSucesso: string;
  urlCancelamento: string;
}

/**
 * Cria a sessao de checkout da assinatura mensal.
 *
 * `client_reference_id` e `metadata.clinica_id` carregam o id da clinica ate o
 * webhook: e assim que o evento volta a ser ligado ao tenant certo, sem confiar
 * em nada que o navegador tenha mandado.
 *
 * `idempotencyKey` protege o duplo clique no botao - sem ela, duas sessoes (e
 * potencialmente duas assinaturas) sao criadas para a mesma clinica.
 */
export async function criarSessaoDeCheckout(
  dados: DadosDaSessao,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const { priceId } = getConfiguracaoStripe();

  return stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      ...(dados.customerId
        ? { customer: dados.customerId }
        : { customer_email: dados.email }),

      client_reference_id: dados.clinicaId,
      subscription_data: {
        metadata: { clinica_id: dados.clinicaId, clinica_nome: dados.clinicaNome },
      },
      metadata: { clinica_id: dados.clinicaId },

      success_url: dados.urlSucesso,
      cancel_url: dados.urlCancelamento,

      locale: "pt-BR",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    },
    // Uma sessao por clinica por hora: absorve o duplo clique sem impedir que
    // a pessoa volte mais tarde e tente de novo.
    { idempotencyKey: `checkout:${dados.clinicaId}:${new Date().toISOString().slice(0, 13)}` },
  );
}

/**
 * Portal de faturamento: a clinica troca o cartao, ve as faturas e cancela
 * sozinha. Sem isto, cada pedido desses vira trabalho manual do suporte.
 */
export async function criarSessaoDoPortal(
  customerId: string,
  urlRetorno: string,
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: urlRetorno,
    locale: "pt-BR",
  });
}

/** Le a assinatura no Stripe. Usado na sincronizacao manual. */
export async function buscarAssinaturaStripe(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.retrieve(subscriptionId);
}

export interface PrecoDoPlano {
  /** Valor em reais, ja convertido dos centavos que o Stripe usa. */
  valor: number;
  moeda: string;
  intervalo: string | null;
}

/**
 * Le o preco configurado direto do Stripe.
 *
 * A tela mostra este valor em vez de uma constante local: com dois lugares
 * definindo preco, um dia a vitrine anuncia um valor e o cartao e cobrado
 * outro. O Stripe e a fonte porque e ele quem cobra.
 */
export async function buscarPrecoDoPlano(): Promise<PrecoDoPlano | null> {
  const { priceId } = getConfiguracaoStripe();
  const preco = await getStripe().prices.retrieve(priceId);

  if (preco.unit_amount === null) return null;

  return {
    valor: preco.unit_amount / 100,
    moeda: preco.currency.toUpperCase(),
    intervalo: preco.recurring?.interval ?? null,
  };
}
