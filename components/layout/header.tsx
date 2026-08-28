import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";
import { StatusClinicaBadge } from "@/components/shared/status-badge";
import type { ClinicaRow, UsuarioRow } from "@/types/database";

interface HeaderProps {
  clinica: ClinicaRow;
  usuario: UsuarioRow;
  email: string;
}

export function Header({ clinica, usuario, email }: HeaderProps) {
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
      <UserMenu nome={usuario.nome} email={email} />
    </header>
  );
}
