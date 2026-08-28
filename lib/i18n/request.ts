import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { COOKIE_IDIOMA, ehIdioma, IDIOMA_PADRAO } from "./config";

/**
 * Resolve o idioma de cada requisicao a partir do cookie.
 * Valor ausente ou desconhecido cai no padrao, em vez de quebrar a pagina.
 */
export default getRequestConfig(async () => {
  const armazenado = (await cookies()).get(COOKIE_IDIOMA)?.value;
  const locale = ehIdioma(armazenado) ? armazenado : IDIOMA_PADRAO;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
