import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { SeletorTema } from "@/components/layout/seletor-tema";

/**
 * Casca das paginas legais.
 *
 * Sem o menu do produto de proposito: quem chega aqui costuma vir de um link
 * direto, muitas vezes antes de ter conta, e o que precisa e ler e voltar.
 */
export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex rounded-md" aria-label="Página inicial">
            <Logo />
          </Link>
          <SeletorTema />
        </div>
      </header>

      <main id="conteudo" className="flex-1 px-4 py-12 sm:px-6">
        {/* prose-* nao existe aqui (sem plugin de tipografia): o espaçamento
            vertical vem de space-y no proprio conteudo. */}
        <article className="mx-auto w-full max-w-3xl space-y-6 text-sm leading-relaxed">
          {children}
        </article>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
            Início
          </Link>
          <Link href="/privacidade" className="underline-offset-4 hover:text-foreground hover:underline">
            Privacidade
          </Link>
          <Link href="/termos" className="underline-offset-4 hover:text-foreground hover:underline">
            Termos de uso
          </Link>
        </div>
      </footer>
    </div>
  );
}
