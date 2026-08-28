import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { SeletorIdioma } from "@/components/layout/seletor-idioma";
import { SetupNecessario } from "@/components/layout/setup-necessario";
import { supabaseEstaConfigurado } from "@/lib/supabase/config";
import { idiomaAtual } from "@/lib/i18n/acoes";
import { diagnosticoLigado } from "@/lib/actions/mensagens-auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const idioma = await idiomaAtual();

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      {/* Idioma no canto superior direito, tambem antes do login: quem nao
          entende a tela nao consegue criar conta para depois trocar. */}
      <header className="flex items-center justify-between px-4 py-6 sm:px-8">
        <Link href="/" className="inline-flex rounded-md" aria-label="Voltar para a página inicial">
          <Logo />
        </Link>
        <SeletorIdioma idioma={idioma} />
      </header>
      <main
        id="conteudo"
        className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6"
      >
        <div className="w-full max-w-md">
          {/* Sem banco nao existe login nem cadastro possivel: mostrar o
              formulario so para ele falhar depois de preenchido seria pior. */}
          {supabaseEstaConfigurado ? children : <SetupNecessario diagnostico={diagnosticoLigado()} />}
        </div>
      </main>
    </div>
  );
}
