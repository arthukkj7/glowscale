"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Navegacao em drawer para telas pequenas. */
export function MobileNav() {
  const [aberto, setAberto] = useState(false);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
          <MenuIcon className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-dvh max-w-72 translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0">
        <DialogTitle className="sr-only">Menu de navegacao</DialogTitle>
        <DialogDescription className="sr-only">
          Acesse as areas do painel GlowScale.
        </DialogDescription>
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" onClick={() => setAberto(false)} className="rounded-md">
            <Logo />
          </Link>
        </div>
        <div className="px-3 pb-6">
          <SidebarNav aoNavegar={() => setAberto(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
