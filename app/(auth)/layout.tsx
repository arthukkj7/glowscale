import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { SetupNecessario } from "@/components/layout/setup-necessario";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="px-4 py-6 sm:px-8">
        <Link href="/" className="inline-flex rounded-md" aria-label="Voltar para a página inicial">
          <Logo />
        </Link>
      </header>
      <main
        id="conteudo"
        className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6"
      >
        <div className="w-full max-w-md">
          {/* Sem Supabase nao existe login nem cadastro possivel: mostrar o
              formulario so para ele falhar depois de preenchido seria pior. */}
          {supabaseEstaConfigurado ? children : <SetupNecessario />}
        </div>
      </main>
    </div>
  );
}
