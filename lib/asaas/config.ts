import "server-only";

/**
 * Configuracao da integracao Asaas.
 *
 * A API key vive apenas no servidor (process.env.ASAAS_API_KEY) e nunca e
 * logada. Nao existe variavel NEXT_PUBLIC_ para credencial do Asaas.
 */

export type AmbienteAsaas = "sandbox" | "production";

const URLS_POR_AMBIENTE: Record<AmbienteAsaas, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

export interface ConfiguracaoAsaas {
  ambiente: AmbienteAsaas;
  baseUrl: string;
  apiKey: string;
}

export class AsaasNaoConfiguradoError extends Error {
  constructor() {
    super(
      "Integração Asaas não configurada. Defina ASAAS_API_KEY e ASAAS_ENVIRONMENT no ambiente.",
    );
    this.name = "AsaasNaoConfiguradoError";
  }
}

function lerAmbiente(): AmbienteAsaas {
  return process.env.ASAAS_ENVIRONMENT === "production" ? "production" : "sandbox";
}

/** URL base efetiva: ASAAS_BASE_URL sobrescreve o padrao do ambiente. */
export function getBaseUrl(): string {
  const configurada = process.env.ASAAS_BASE_URL?.trim();
  if (configurada) return configurada.replace(/\/$/, "");
  return URLS_POR_AMBIENTE[lerAmbiente()];
}

export function asaasEstaConfigurado(): boolean {
  return Boolean(process.env.ASAAS_API_KEY?.trim());
}

export function getConfiguracaoAsaas(): ConfiguracaoAsaas {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) throw new AsaasNaoConfiguradoError();

  return { ambiente: lerAmbiente(), baseUrl: getBaseUrl(), apiKey };
}

/** Token esperado no header asaas-access-token dos webhooks. */
export function getWebhookToken(): string | null {
  return process.env.ASAAS_WEBHOOK_TOKEN?.trim() || null;
}
