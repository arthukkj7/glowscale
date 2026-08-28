import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  rotulo: string;
  valor: string;
  detalhe?: string;
  icone?: LucideIcon;
  destaque?: "neutro" | "primario" | "sucesso" | "alerta";
}

const tonalidades: Record<NonNullable<StatCardProps["destaque"]>, string> = {
  neutro: "bg-muted text-muted-foreground",
  primario: "bg-primary/10 text-primary",
  sucesso: "bg-success/12 text-success",
  alerta: "bg-warning/18 text-warning-foreground",
};

export function StatCard({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  destaque = "neutro",
}: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {rotulo}
          </p>
          <p className="truncate text-2xl font-semibold tracking-tight" title={valor}>
            {valor}
          </p>
          {detalhe ? <p className="text-xs text-muted-foreground">{detalhe}</p> : null}
        </div>
        {Icone ? (
          <span
            aria-hidden="true"
            className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tonalidades[destaque])}
          >
            <Icone className="size-4.5" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
