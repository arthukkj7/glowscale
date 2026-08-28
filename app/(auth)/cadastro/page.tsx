import type { Metadata } from "next";

import { CadastroForm } from "@/components/auth/cadastro-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Crie a conta do seu negócio de beleza e comece a controlar agenda, atendimentos e comissões.",
  alternates: { canonical: "/cadastro" },
};

export default function CadastroPage() {
  return (
    <Card className="p-8">
      <div className="mb-8 space-y-1.5">
        <h1 className="texto-display text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="text-sm text-muted-foreground">
          Configure seu negócio em menos de um minuto.
        </p>
      </div>
      <CadastroForm />
    </Card>
  );
}
