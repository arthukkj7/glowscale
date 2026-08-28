import type { Metadata } from "next";

import { RedefinirSenhaForm } from "@/components/auth/redefinir-senha-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Nova senha",
  robots: { index: false, follow: false },
};

export default function RedefinirSenhaPage() {
  return (
    <Card className="p-8">
      <div className="mb-8 space-y-1.5">
        <h1 className="texto-display text-2xl font-semibold tracking-tight">Criar nova senha</h1>
        <p className="text-sm text-muted-foreground">
          Escolha uma nova senha para acessar sua conta.
        </p>
      </div>
      <RedefinirSenhaForm />
    </Card>
  );
}
