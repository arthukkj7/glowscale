import type { Metadata } from "next";

import { RecuperarSenhaForm } from "@/components/auth/recuperar-senha-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Receba por e-mail as instrucoes para redefinir a senha da sua conta GlowScale.",
  robots: { index: false, follow: false },
};

export default function RecuperarSenhaPage() {
  return (
    <Card className="p-8">
      <div className="mb-8 space-y-1.5">
        <h1 className="texto-display text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Informe o e-mail cadastrado e enviaremos um link para criar uma nova senha.
        </p>
      </div>
      <RecuperarSenhaForm />
    </Card>
  );
}
