"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ITENS_DE_NAVEGACAO } from "./nav-items";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  aoNavegar?: () => void;
}

/** Lista de navegacao com destaque da rota ativa. */
export function SidebarNav({ aoNavegar }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegacao principal" className="flex flex-col gap-1">
      {ITENS_DE_NAVEGACAO.map(({ titulo, href, icone: Icone }) => {
        const ativo = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={aoNavegar}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              ativo
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icone className="size-4.5 shrink-0" aria-hidden="true" />
            {titulo}
          </Link>
        );
      })}
    </nav>
  );
}
