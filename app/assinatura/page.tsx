import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PlanosView } from "@/components/assinatura/planos-view";
import { Logo } from "@/components/layout/logo";
import { SeletorIdioma } from "@/components/layout/seletor-idioma";
import { UserMenu } from "@/components/layout/user-menu";
import { StatusClinicaBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { assinaturaLiberaAcesso, diasRestantesDeTeste, requireSessao } from "@/lib/auth/session";
import { idiomaAtual } from "@/lib/i18n/acoes";
import { DIAS_DE_TESTE } from "@/lib/planos";
import { planosDisponiveis, stripeEmProducao } from "@/lib/stripe/config";
import { serviceRoleDisponivel } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Assinatura",
  robots: { index: false, follow: false },
};

/**
 * Escolha de plano. Acessivel mesmo com o teste vencido - e justamente onde a
 * pessoa regulariza a situacao.
 */
export default async function AssinaturaPage() {
  const { clinica, usuario, assinatura, email } = await requireSessao();
  const [t, idioma] = await Promise.all([getTranslations("planos"), idiomaAtual()]);

  const acessoLiberado = assinaturaLiberaAcesso(clinica);
  const diasRestantes = diasRestantesDeTeste(clinica);
  const testeVencido = clinica.status === "trial" && !acessoLiberado;

  const disponiveis = serviceRoleDisponivel() ? planosDisponiveis() : [];

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1">
          <SeletorIdioma idioma={idioma} />
          <UserMenu nome={usuario.nome} email={email} />
        </div>
      </header>

      <main id="conteudo" className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="texto-display text-3xl font-semibold tracking-tight">
              {t("titulo")}
            </h1>
            <p className="text-muted-foreground">
              {t("subtitulo", { dias: DIAS_DE_TESTE })}
            </p>
            <p className="flex items-center justify-center gap-2 pt-1 text-sm">
              <span className="text-muted-foreground">{clinica.nome}</span>
              <StatusClinicaBadge status={clinica.status} />
            </p>
          </div>

          <PlanosView
            disponiveis={disponiveis}
            planoAtual={clinica.plano}
            assinaturaIniciada={Boolean(assinatura?.stripe_subscription_id)}
            temCadastroDeCobranca={Boolean(assinatura?.stripe_customer_id)}
            emProducao={stripeEmProducao()}
            diasRestantes={diasRestantes}
            testeVencido={testeVencido}
          />

          {acessoLiberado ? (
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard">Ir para o painel</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
