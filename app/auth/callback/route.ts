import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Callback do Supabase Auth (confirmacao de e-mail e recuperacao de senha).
 * Troca o code por sessao e devolve o usuario para uma rota interna segura.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const proximoBruto = searchParams.get("proximo") ?? "/dashboard";
  // So aceitamos caminhos relativos: bloqueia open redirect.
  const proximo = proximoBruto.startsWith("/") && !proximoBruto.startsWith("//")
    ? proximoBruto
    : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=link-invalido`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn("[auth] callback recusado", { motivo: error.message });
    return NextResponse.redirect(`${origin}/login?erro=link-expirado`);
  }

  return NextResponse.redirect(`${origin}${proximo}`);
}
