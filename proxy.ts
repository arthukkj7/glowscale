import type { NextRequest } from "next/server";

import { atualizarSessao } from "@/lib/supabase/proxy";

/**
 * Proxy (antigo middleware) do Next.js.
 * Responsavel por renovar a sessao do Supabase em toda navegacao e por barrar
 * usuarios nao autenticados antes de qualquer Server Component rodar.
 */
export default async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto assets estaticos e arquivos de imagem.
     * O webhook do Asaas passa pelo proxy mas e tratado como rota publica.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
