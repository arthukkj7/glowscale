import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { getSupabasePublicConfigOrNull } from "./config";

/** Rotas que nunca exigem sessao. */
const ROTAS_PUBLICAS = [
  "/",
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha",
  "/auth/callback",
  "/auth/confirmar",
  // Documentos legais precisam ser lidos ANTES de criar conta - e e o que uma
  // plataforma de anuncio busca antes de aprovar o site. Exigir login para
  // le-los derrotaria o proposito dos dois.
  "/privacidade",
  "/termos",
] as const;

/** Rotas de autenticacao das quais um usuario logado deve ser tirado. */
const ROTAS_AUTENTICACAO = ["/login", "/cadastro", "/recuperar-senha"] as const;

function ehRotaPublica(pathname: string): boolean {
  if (pathname.startsWith("/api/webhooks/")) return true;
  return ROTAS_PUBLICAS.some(
    (rota) => pathname === rota || (rota !== "/" && pathname.startsWith(`${rota}/`)),
  );
}

/**
 * Renova a sessao do Supabase e aplica a protecao de rotas.
 *
 * O gate de assinatura NAO acontece aqui: ele exige consultar o banco e vive
 * no layout do dashboard (requireActiveSubscription), server-side.
 */
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const config = getSupabasePublicConfigOrNull();
  if (!config) {
    // Ambiente ainda nao configurado: a propria UI explica o que falta.
    return response;
  }

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !ehRotaPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("proximo", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && ROTAS_AUTENTICACAO.some((rota) => pathname === rota)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
