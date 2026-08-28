import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pagina nao encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="texto-display text-3xl font-semibold tracking-tight">
          Pagina nao encontrada
        </h1>
        <p className="max-w-md text-muted-foreground">
          O endereco acessado nao existe ou foi movido.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Ir para o painel</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Pagina inicial</Link>
        </Button>
      </div>
    </div>
  );
}
