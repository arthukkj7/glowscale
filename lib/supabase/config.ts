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
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local (veja .env.local.example).",
    );
  }
  return config;
}

export const supabaseEstaConfigurado = getSupabasePublicConfigOrNull() !== null;

/**
 * Extrai a referencia do projeto a partir da URL publica.
 * "https://abcdefgh.supabase.co" -> "abcdefgh"
 *
 * Serve para montar links diretos para o painel do dono da instalacao. A URL
 * ja e publica (vai no bundle do browser), entao nao ha nada a proteger aqui.
 */
export function getProjectRefOrNull(): string | null {
  const config = getSupabasePublicConfigOrNull();
  if (!config) return null;
  const casou = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)\/?$/i.exec(config.url.trim());
  return casou?.[1] ?? null;
}

/**
 * Link direto para uma pagina do painel do Supabase deste projeto.
 * Retorna null em instalacoes self-hosted, onde o painel nao fica nesse dominio.
 */
export function linkDoPainel(caminho: string): string | null {
  const ref = getProjectRefOrNull();
  if (!ref) return null;
  return `https://supabase.com/dashboard/project/${ref}/${caminho.replace(/^\//, "")}`;
}
