/**
 * Idiomas da interface.
 *
 * A escolha vive num cookie, nao na URL. Poderia ser /pt-BR/agenda e
 * /en-US/agenda, mas isso obrigaria a mover todas as rotas para dentro de um
 * segmento [locale] e a reescrever todo Link do sistema. Como o GlowScale nao
 * publica conteudo indexavel por idioma - tudo atras de login, exceto a
 * vitrine - a URL nao precisa carregar o idioma.
 */

export const IDIOMAS = ["pt-BR", "en-US"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_PADRAO: Idioma = "pt-BR";

/** Cookie lido no servidor a cada requisicao. */
export const COOKIE_IDIOMA = "glowscale_idioma";

export const IDIOMA_INFO: Record<Idioma, { nome: string; bandeira: string; curto: string }> = {
  "pt-BR": { nome: "Português (Brasil)", bandeira: "🇧🇷", curto: "PT" },
  "en-US": { nome: "English (US)", bandeira: "🇺🇸", curto: "EN" },
};

export function ehIdioma(valor: string | undefined): valor is Idioma {
  return valor !== undefined && (IDIOMAS as readonly string[]).includes(valor);
}

/**
 * Locale para Intl (moeda, datas, numeros).
 *
 * Atencao: o idioma da interface nao muda a MOEDA. Um negocio brasileiro cobra
 * em real mesmo com a interface em ingles - trocar para dolar por causa do
 * idioma inventaria uma conversao que nunca aconteceu.
 */
export const LOCALE_DE_FORMATO: Record<Idioma, string> = {
  "pt-BR": "pt-BR",
  "en-US": "en-US",
};
