import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { LoginSocial } from "@/components/auth/login-social";
import { GlowScaleMark } from "@/components/layout/glowscale-mark";
import { provedoresHabilitados } from "@/lib/auth/oauth";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o painel do seu negócio no GlowScale.",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ proximo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { proximo } = await searchParams;
  const provedores = provedoresHabilitados();
  const t = await getTranslations("auth");

  return (
    <div
      className={
        // O degrade sai do rosa da marca e morre no fundo do cartao: da
        // profundidade ao topo sem pintar um bloco de cor.
        "mx-auto flex w-full max-w-sm flex-col items-center rounded-3xl border border-border " +
        "bg-gradient-to-b from-primary/[0.07] to-card p-8 shadow-xl shadow-primary/5"
      }
    >
      <span
        aria-hidden="true"
        className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-card shadow-lg shadow-primary/10"
      >
        <GlowScaleMark tamanho={32} className="text-primary" />
      </span>

      <h1 className="texto-display text-center text-2xl font-semibold tracking-tight">
        {t("entrarTitulo")}
      </h1>
      <p className="mb-6 mt-2 text-center text-sm text-muted-foreground">
        {t("entrarSubtitulo")}
      </p>

      <LoginForm proximo={proximo} />

      {provedores.length > 0 ? (
        <div className="mt-5 w-full">
          <LoginSocial provedores={provedores} proximo={proximo} />
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("semConta")}{" "}
        <Link
          href="/cadastro"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("criarConta")}
        </Link>
      </p>
    </div>
  );
}
