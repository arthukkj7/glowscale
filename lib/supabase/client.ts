"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "./config";

/**
 * Client do browser. Usa apenas a chave publicavel e respeita RLS.
 * Empregado somente onde o fluxo precisa mesmo rodar no cliente
 * (login, cadastro e redefinicao de senha do Supabase Auth).
 */
export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
