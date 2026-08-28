import "server-only";

import { headers } from "next/headers";

/**
 * URL publica desta instalacao, usada em links de e-mail e nos retornos de
 * checkout. NEXT_PUBLIC_APP_URL manda; sem ela, os cabecalhos do request
 * respondem - o que faz preview deploys funcionarem sem configuracao extra.
 */
export async function getAppUrl(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_APP_URL;
  if (configurada) return configurada.replace(/\/$/, "");

  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "http";
  return host ? `${protocolo}://${host}` : "http://localhost:3000";
}
