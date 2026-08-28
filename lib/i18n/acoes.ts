"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { COOKIE_IDIOMA, ehIdioma, IDIOMA_PADRAO, type Idioma } from "./config";

/** Idioma escolhido, lido no servidor. */
export async function idiomaAtual(): Promise<Idioma> {
  const armazenado = (await cookies()).get(COOKIE_IDIOMA)?.value;
  return ehIdioma(armazenado) ? armazenado : IDIOMA_PADRAO;
}

/**
 * Troca o idioma da interface.
 *
 * Guardado em cookie, nao no perfil do usuario: a escolha e do dispositivo.
 * A mesma pessoa pode preferir portugues no celular do balcao e ingles no
 * computador - e quem ainda nao fez login tambem precisa poder trocar.
 */
export async function trocarIdioma(valor: string): Promise<void> {
  const idioma = ehIdioma(valor) ? valor : IDIOMA_PADRAO;

  (await cookies()).set(COOKIE_IDIOMA, idioma, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    // Sem httpOnly: nao e credencial, e nao ha nada a proteger numa
    // preferencia de idioma.
    httpOnly: false,
  });

  revalidatePath("/", "layout");
}
