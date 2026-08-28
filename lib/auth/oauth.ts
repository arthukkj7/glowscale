/**
 * Login social.
 *
 * A lista vem de NEXT_PUBLIC_OAUTH_PROVIDERS (ex.: "google,apple"). Um provedor
 * so aparece na tela depois de ativado no painel do Supabase e listado aqui.
 *
 * O motivo de existir a variavel em vez de mostrar os tres sempre: um botao de
 * "Entrar com Google" que devolve erro porque o provedor nao esta configurado
 * custa mais confianca do que a ausencia do botao. Melhor nao oferecer do que
 * oferecer quebrado.
 */

export const PROVEDORES_OAUTH = ["google", "facebook", "apple"] as const;
export type ProvedorOAuth = (typeof PROVEDORES_OAUTH)[number];

export const ROTULO_OAUTH: Record<ProvedorOAuth, string> = {
  google: "Google",
  facebook: "Facebook",
  apple: "Apple",
};

function ehProvedor(valor: string): valor is ProvedorOAuth {
  return (PROVEDORES_OAUTH as readonly string[]).includes(valor);
}

/**
 * Provedores habilitados nesta instalacao, na ordem em que foram listados.
 *
 * A referencia a process.env.NEXT_PUBLIC_* precisa ser literal para o Next
 * conseguir inlina-la no bundle do browser.
 */
export function provedoresHabilitados(): ProvedorOAuth[] {
  const bruta = process.env.NEXT_PUBLIC_OAUTH_PROVIDERS;
  if (!bruta) return [];

  const vistos = new Set<ProvedorOAuth>();
  for (const parte of bruta.split(",")) {
    const nome = parte.trim().toLowerCase();
    if (ehProvedor(nome)) vistos.add(nome);
  }
  return [...vistos];
}
