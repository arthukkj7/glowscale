import "server-only";

import { asaasEstaConfigurado } from "@/lib/asaas/config";
import { stripeEstaConfigurado } from "@/lib/stripe/config";

/**
 * Quem cobra a mensalidade nesta instalacao.
 *
 * A escolha e do ambiente, nao do navegador: PAGAMENTO_PROVEDOR decide, e na
 * ausencia dela vale o que estiver configurado. Deixar o cliente escolher o
 * provedor abriria caminho para pedir checkout num provedor sem credencial.
 */
export type ProvedorDePagamento = "stripe" | "asaas";

export function provedorAtivo(): ProvedorDePagamento | null {
  const escolhido = process.env.PAGAMENTO_PROVEDOR?.trim().toLowerCase();

  // Escolha explicita: se o provedor pedido nao esta configurado, o resultado e
  // "nenhum". Cair no outro silenciosamente cobraria pelo caminho errado.
  if (escolhido === "stripe") return stripeEstaConfigurado() ? "stripe" : null;
  if (escolhido === "asaas") return asaasEstaConfigurado() ? "asaas" : null;

  if (stripeEstaConfigurado()) return "stripe";
  if (asaasEstaConfigurado()) return "asaas";
  return null;
}
