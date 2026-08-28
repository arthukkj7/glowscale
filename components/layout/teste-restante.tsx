"use client";

import { useTranslations } from "next-intl";

/**
 * Contador de dias de teste.
 *
 * Componente de cliente porque next-intl precisa do contexto de traducao, e o
 * Header e usado dentro de um layout que ja recebe o idioma do servidor.
 */
export function TesteRestante({ dias }: { dias: number }) {
  const t = useTranslations("planos");
  return (
    <span>
      {dias <= 1 ? t("testeUltimoDia") : t("testeRestante", { dias: `${dias} dias` })}
    </span>
  );
}
