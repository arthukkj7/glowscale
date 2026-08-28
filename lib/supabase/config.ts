/**
 * Configuracao publica do Supabase.
 *
 * As referencias a process.env.NEXT_PUBLIC_* precisam ser literais para que o
 * Next consiga inlina-las no bundle do browser. Nenhum segredo passa por aqui.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Projetos novos usam a nomenclatura "publishable key"; os antigos, "anon key".
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

/** Retorna a configuracao publica ou null quando o ambiente nao esta pronto. */
export function getSupabasePublicConfigOrNull(): SupabasePublicConfig | null {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  return { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY };
}

/** Igual ao anterior, mas falha alto quando o ambiente nao esta configurado. */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfigOrNull();
  if (!config) {
    throw new SupabaseConfigError(
      "Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local (veja .env.local.example).",
    );
  }
  return config;
}

export const supabaseEstaConfigurado = getSupabasePublicConfigOrNull() !== null;
