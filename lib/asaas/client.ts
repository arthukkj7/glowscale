import "server-only";

import { getConfiguracaoAsaas } from "./config";

/**
 * Cliente HTTP minimo para a API do Asaas (v3).
 *
 * Autenticacao: header `access_token` com a chave da conta, conforme a
 * documentacao oficial. A chave nunca entra em log, mensagem de erro ou
 * resposta devolvida ao browser.
 */

const TIMEOUT_MS = 15_000;

export class AsaasApiError extends Error {
  readonly status: number;
  readonly detalhes: readonly string[];

  constructor(status: number, detalhes: readonly string[]) {
    super(detalhes[0] ?? `Asaas respondeu com status ${status}.`);
    this.name = "AsaasApiError";
    this.status = status;
    this.detalhes = detalhes;
  }
}

interface RespostaDeErroAsaas {
  errors?: { code?: string; description?: string }[];
}

function extrairMensagens(corpo: unknown): string[] {
  if (typeof corpo !== "object" || corpo === null) return [];
  const erros = (corpo as RespostaDeErroAsaas).errors;
  if (!Array.isArray(erros)) return [];
  return erros
    .map((erro) => erro.description)
    .filter((descricao): descricao is string => typeof descricao === "string");
}

export interface OpcoesDeRequisicao {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

export async function requisitarAsaas<T>({
  method = "GET",
  path,
  query,
  body,
}: OpcoesDeRequisicao): Promise<T> {
  const { baseUrl, apiKey } = getConfiguracaoAsaas();

  const url = new URL(`${baseUrl}${path}`);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined) url.searchParams.set(chave, String(valor));
  }

  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(url, {
      method,
      headers: {
        access_token: apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "GlowScale",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controlador.signal,
      cache: "no-store",
    });

    const texto = await resposta.text();
    const corpo: unknown = texto ? JSON.parse(texto) : null;

    if (!resposta.ok) {
      const mensagens = extrairMensagens(corpo);
      // Log sem corpo completo e sem credencial: apenas rota e status.
      console.error("[asaas] requisicao recusada", {
        method,
        path,
        status: resposta.status,
        mensagens,
      });
      throw new AsaasApiError(resposta.status, mensagens);
    }

    return corpo as T;
  } catch (erro) {
    if (erro instanceof AsaasApiError) throw erro;
    if (erro instanceof Error && erro.name === "AbortError") {
      console.error("[asaas] timeout na requisicao", { method, path });
      throw new AsaasApiError(408, ["Tempo de resposta do Asaas excedido."]);
    }
    console.error("[asaas] falha de rede", {
      method,
      path,
      erro: erro instanceof Error ? erro.message : "desconhecido",
    });
    throw new AsaasApiError(0, ["Não foi possível falar com o Asaas."]);
  } finally {
    clearTimeout(timeout);
  }
}
