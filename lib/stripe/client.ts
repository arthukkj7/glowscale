import "server-only";

import Stripe from "stripe";

import { getConfiguracaoStripe } from "./config";

let instancia: Stripe | null = null;
let chaveDaInstancia: string | null = null;

/**
 * Cliente Stripe compartilhado.
 *
 * Guardado em modulo porque a lambda e reaproveitada entre requisicoes e abrir
 * um cliente novo a cada chamada joga fora o keep-alive das conexoes. A chave e
 * comparada junto para que uma troca de credencial em runtime nao continue
 * usando a instancia antiga.
 */
export function getStripe(): Stripe {
  const { secretKey } = getConfiguracaoStripe();

  if (!instancia || chaveDaInstancia !== secretKey) {
    instancia = new Stripe(secretKey, {
      // Fixar a versao evita que uma mudanca no lado do Stripe altere o formato
      // das respostas sem um deploy nosso.
      apiVersion: "2026-08-26.dahlia",
      appInfo: { name: "GlowScale", url: "https://github.com/arthukkj7/glowscale" },
      maxNetworkRetries: 2,
    });
    chaveDaInstancia = secretKey;
  }

  return instancia;
}
