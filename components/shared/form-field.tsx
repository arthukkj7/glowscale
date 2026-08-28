import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  rotulo: string;
  children: ReactNode;
  erro?: string;
  descricao?: string;
  obrigatorio?: boolean;
  className?: string;
}

/**
 * Envolve um controle de formulario com label, descricao e mensagem de erro,
 * ligando tudo por aria-describedby.
 */
export function FormField({
  id,
  rotulo,
  children,
  erro,
  descricao,
  obrigatorio,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {rotulo}
        {obrigatorio ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {descricao && !erro ? (
        <p id={`${id}-descricao`} className="text-xs text-muted-foreground">
          {descricao}
        </p>
      ) : null}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-xs font-medium text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/** Atributos de acessibilidade derivados do estado do campo. */
export function camposAria(id: string, erro?: string, descricao?: string) {
  const descritores = [erro ? `${id}-erro` : null, descricao && !erro ? `${id}-descricao` : null]
    .filter(Boolean)
    .join(" ");
  return {
    id,
    "aria-invalid": erro ? true : undefined,
    "aria-describedby": descritores || undefined,
  } as const;
}
