import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ColunaTabela<T> {
  chave: string;
  cabecalho: string;
  celula: (registro: T) => ReactNode;
  className?: string;
  /** Oculta a coluna em telas pequenas. */
  apenasDesktop?: boolean;
  alinhamento?: "esquerda" | "direita";
}

interface DataTableProps<T> {
  colunas: readonly ColunaTabela<T>[];
  registros: readonly T[];
  chaveDoRegistro: (registro: T) => string;
  vazio?: ReactNode;
  rodape?: ReactNode;
}

/** Tabela de dados generica, tipada e com tratamento de lista vazia. */
export function DataTable<T>({
  colunas,
  registros,
  chaveDoRegistro,
  vazio,
  rodape,
}: DataTableProps<T>) {
  if (registros.length === 0 && vazio) {
    return <>{vazio}</>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {colunas.map((coluna) => (
            <TableHead
              key={coluna.chave}
              className={cn(
                coluna.apenasDesktop && "hidden md:table-cell",
                coluna.alinhamento === "direita" && "text-right",
                coluna.className,
              )}
            >
              {coluna.cabecalho}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {registros.map((registro) => (
          <TableRow key={chaveDoRegistro(registro)}>
            {colunas.map((coluna) => (
              <TableCell
                key={coluna.chave}
                className={cn(
                  coluna.apenasDesktop && "hidden md:table-cell",
                  coluna.alinhamento === "direita" && "text-right tabular-nums",
                  coluna.className,
                )}
              >
                {coluna.celula(registro)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {rodape}
    </Table>
  );
}
