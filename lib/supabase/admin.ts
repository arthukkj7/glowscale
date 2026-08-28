import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "./config";

/**
 * Client com service role. IGNORA RLS.
 *
 * Regras de uso:
 *  - somente em codigo server-side (o import de "server-only" garante isso);
 *  - somente onde nao existe sessao de usuario ou onde a escrita precisa ser
 *    privilegiada por design: webhook do Asaas e atualizacao de assinatura;
 *  - toda query feita por aqui precisa filtrar clinica_id explicitamente.
 *
 * A chave nunca e logada nem devolvida em mensagens de erro.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária para operacoes de assinatura.",
    );
  }

  const { url } = getSupabasePublicConfig();

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export function serviceRoleDisponivel(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
