import Link from "next/link";

import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";

/** Sidebar fixa do desktop. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard" className="rounded-md" aria-label="Ir para o dashboard">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-suave">
        <SidebarNav />
      </div>
      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-xs text-muted-foreground">
          GlowScale - gestao para clinicas de estetica
        </p>
      </div>
    </aside>
  );
}
