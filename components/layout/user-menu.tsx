"use client";

import { ChevronDownIcon, LogOutIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sair } from "@/lib/actions/auth";

interface UserMenuProps {
  nome: string;
  email: string;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).slice(0, 2);
  return partes.map((parte) => parte.charAt(0).toUpperCase()).join("") || "?";
}

export function UserMenu({ nome, email }: UserMenuProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();

  function aoSair() {
    startTransition(async () => {
      const resultado = await sair();
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      router.replace(resultado.data.destino);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm transition-colors hover:bg-accent"
        aria-label="Menu do usuário"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary"
        >
          {iniciais(nome)}
        </span>
        <span className="hidden max-w-32 truncate font-medium sm:inline">{nome}</span>
        <ChevronDownIcon className="size-4 opacity-60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <span className="block truncate">{nome}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/configuracoes">
            <SettingsIcon aria-hidden="true" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={aoSair} disabled={pendente}>
          <LogOutIcon aria-hidden="true" />
          {pendente ? "Saindo..." : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
