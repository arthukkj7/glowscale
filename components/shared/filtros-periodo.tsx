import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProfissionalRow } from "@/types/database";

interface FiltrosPeriodoProps {
  /** Rota que recebe o GET do formulario. */
  action: string;
  dataInicial: string;
  dataFinal: string;
  profissionalId: string;
  status: string;
  profissionais: ProfissionalRow[];
  incluirStatus?: boolean;
}

const estiloCampo =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Filtros de periodo em formulario GET.
 *
 * Sem JavaScript no cliente: o navegador envia os parametros na URL e a
 * pagina refaz a consulta no servidor. Os filtros viram WHERE no PostgreSQL,
 * nunca um filtro em memoria sobre uma lista inteira.
 */
export function FiltrosPeriodo({
  action,
  dataInicial,
  dataFinal,
  profissionalId,
  status,
  profissionais,
  incluirStatus = true,
}: FiltrosPeriodoProps) {
  return (
    <Card className="p-4">
      <form
        method="get"
        action={action}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="filtro-data-inicial">Data inicial</Label>
          <input
            id="filtro-data-inicial"
            name="dataInicial"
            type="date"
            defaultValue={dataInicial}
            className={estiloCampo}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filtro-data-final">Data final</Label>
          <input
            id="filtro-data-final"
            name="dataFinal"
            type="date"
            defaultValue={dataFinal}
            className={estiloCampo}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="filtro-profissional">Profissional</Label>
          <select
            id="filtro-profissional"
            name="profissionalId"
            defaultValue={profissionalId}
            className={estiloCampo}
          >
            <option value="todas">Todas</option>
            {profissionais.map((profissional) => (
              <option key={profissional.id} value={profissional.id}>
                {profissional.nome}
              </option>
            ))}
          </select>
        </div>

        {incluirStatus ? (
          <div className="space-y-2">
            <Label htmlFor="filtro-status">Status</Label>
            <select
              id="filtro-status"
              name="status"
              defaultValue={status}
              className={estiloCampo}
            >
              <option value="realizado">Realizados</option>
              <option value="cancelado">Cancelados</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <Button type="submit">Aplicar</Button>
          <Link
            href={action}
            className={cn(buttonVariants({ variant: "ghost" }), "whitespace-nowrap")}
          >
            Limpar
          </Link>
        </div>
      </form>
    </Card>
  );
}
