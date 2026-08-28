import { MobileNav } from "./mobile-nav";
import { SeletorIdioma } from "./seletor-idioma";
import { SeletorTema } from "./seletor-tema";
import { UserMenu } from "./user-menu";
import { StatusClinicaBadge } from "@/components/shared/status-badge";
import type { ClinicaRow, UsuarioRow } from "@/types/database";
import type { Idioma } from "@/lib/i18n/config";
import Link from "next/link";
import { TesteRestante } from "./teste-restante";

interface HeaderProps {
  clinica: ClinicaRow;
  usuario: UsuarioRow;
  email: string;
  idioma: Idioma;
  /** null quando nao esta em periodo de teste. */
  diasDeTesteRestantes: number | null;
}

export function Header({ clinica, usuario, email, idioma, diasDeTesteRestantes }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
      <MobileNav />
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <p className="truncate font-medium" title={clinica.nome_fantasia ?? clinica.nome}>
          {clinica.nome_fantasia ?? clinica.nome}
        </p>
        <span className="hidden sm:inline">
          <StatusClinicaBadge status={clinica.status} />
        </span>
      </div>

      {/* O contador de teste fica no cabecalho, visivel em toda navegacao:
          uma cobranca que chega sem aviso e o tipo de surpresa que gera
          estorno e reclamacao, nao receita. */}
      {diasDeTesteRestantes !== null ? (
        <Link
          href="/assinatura"
          className="hidden shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 sm:inline-flex"
        >
          <TesteRestante dias={diasDeTesteRestantes} />
        </Link>
      ) : null}

      <SeletorTema />
      <SeletorIdioma idioma={idioma} />
      <UserMenu nome={usuario.nome} email={email} />
    </header>
  );
}
