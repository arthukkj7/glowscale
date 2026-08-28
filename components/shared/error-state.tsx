import { AlertTriangleIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ErrorStateProps {
  titulo?: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}

/**
 * Estado de erro amigavel. Nunca recebe stack trace: o detalhe tecnico fica
 * apenas no log do servidor.
 */
export function ErrorState({
  titulo = "Nao conseguimos carregar estas informacoes",
  descricao = "Tente novamente em instantes. Se o problema continuar, entre em contato com o suporte.",
  acao,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <AlertTriangleIcon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{descricao}</p>
      </div>
      {acao ? <div className="pt-2">{acao}</div> : null}
    </div>
  );
}
