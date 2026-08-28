import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o painel da sua clinica no GlowScale.",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ proximo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { proximo } = await searchParams;

  return (
    <Card className="p-8">
      <div className="mb-8 space-y-1.5">
        <h1 className="texto-display text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="text-sm text-muted-foreground">
          Acesse o painel da sua clinica.
        </p>
      </div>
      <LoginForm proximo={proximo} />
    </Card>
  );
}
