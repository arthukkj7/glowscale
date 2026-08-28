import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  titulo: string;
  descricao?: string;
  icone?: LucideIcon;
  acao?: ReactNode;
  className?: string;
}

export function EmptyState({
  titulo,
  descricao,
  icone: Icone,
  acao,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-14 text-center",
        className,
      )}
    >
      {Icone ? (
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground"
        >
          <Icone className="size-5" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        {descricao ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acao ? <div className="pt-2">{acao}</div> : null}
    </div>
  );
}
