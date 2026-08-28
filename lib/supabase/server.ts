import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "./config";

/**
 * Client para Server Components, Server Actions e Route Handlers.
 * Continua usando a chave publicavel: toda autorizacao passa por RLS,
 * com a sessao do usuario lida dos cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicConfig();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components nao podem escrever cookies. O refresh de sessao
          // acontece no proxy (proxy.ts), entao ignorar aqui e seguro.
        }
      },
    },
  });
}
