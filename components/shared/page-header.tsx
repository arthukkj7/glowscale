import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  className?: string;
}

export function PageHeader({ titulo, descricao, acoes, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="texto-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {titulo}
        </h1>
        {descricao ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  );
}
