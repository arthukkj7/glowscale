import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { Logo } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";
import { getEstadoSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Configurar clinica",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const estado = await getEstadoSessao();

  if (estado.tipo === "anonimo") redirect("/login");
  if (estado.tipo === "completo") redirect("/dashboard");

  // Nome da clinica sugerido no cadastro fica nos metadados do auth user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const metadados = user?.user_metadata as { clinica_nome?: unknown } | undefined;
  const clinicaSugerida =
    typeof metadados?.clinica_nome === "string" ? metadados.clinica_nome : "";

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="px-4 py-6 sm:px-8">
        <Logo />
      </header>
      <main id="conteudo" className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        <Card className="w-full max-w-md p-8">
          <div className="mb-8 space-y-1.5">
            <h1 className="texto-display text-2xl font-semibold tracking-tight">
              Vamos configurar sua clinica
            </h1>
            <p className="text-sm text-muted-foreground">
              Estes dados podem ser alterados depois em Configuracoes.
            </p>
          </div>
          <OnboardingForm
            nomeSugerido={estado.nomeSugerido}
            clinicaSugerida={clinicaSugerida}
          />
        </Card>
      </main>
    </div>
  );
}
