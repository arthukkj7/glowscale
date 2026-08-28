import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  paginaAtual: number;
  totalPaginas: number;
  total: number;
  /** Constroi a URL de uma pagina preservando os filtros atuais. */
  hrefDaPagina: (pagina: number) => string;
}

/** Paginacao server-side: navegacao por links, sem estado no cliente. */
export function Pagination({
  paginaAtual,
  totalPaginas,
  total,
  hrefDaPagina,
}: PaginationProps) {
  if (totalPaginas <= 1) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        {total} {total === 1 ? "registro" : "registros"}
      </p>
    );
  }

  const temAnterior = paginaAtual > 1;
  const temProxima = paginaAtual < totalPaginas;
  const estiloBotao = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <nav
      aria-label="Paginacao"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-muted-foreground">
        Página {paginaAtual} de {totalPaginas} - {total} {total === 1 ? "registro" : "registros"}
      </p>
      <div className="flex items-center gap-2">
        {temAnterior ? (
          <Link href={hrefDaPagina(paginaAtual - 1)} className={estiloBotao} rel="prev">
            <ChevronLeftIcon className="size-4" />
            Anterior
          </Link>
        ) : (
          <span className={cn(estiloBotao, "pointer-events-none opacity-50")} aria-disabled="true">
            <ChevronLeftIcon className="size-4" />
            Anterior
          </span>
        )}
        {temProxima ? (
          <Link href={hrefDaPagina(paginaAtual + 1)} className={estiloBotao} rel="next">
            Próxima
            <ChevronRightIcon className="size-4" />
          </Link>
        ) : (
          <span className={cn(estiloBotao, "pointer-events-none opacity-50")} aria-disabled="true">
            Próxima
            <ChevronRightIcon className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
