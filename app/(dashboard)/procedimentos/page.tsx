import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { TabelaSkeleton } from "@/components/shared/loading-state";
import { ProcedimentosView } from "@/components/procedimentos/procedimentos-view";
import { listarProcedimentos } from "@/lib/data/procedimentos";

export const metadata: Metadata = { title: "Procedimentos" };

interface PageProps {
  searchParams: Promise<{ pagina?: string; busca?: string }>;
}

async function ListaDeProcedimentos({ pagina, busca }: { pagina: number; busca?: string }) {
  const { registros, total, totalPaginas, pagina: paginaAtual } = await listarProcedimentos({
    pagina,
    busca,
  });

  const hrefDaPagina = (novaPagina: number) => {
    const query = new URLSearchParams();
    if (busca) query.set("busca", busca);
    query.set("pagina", String(novaPagina));
    return `/procedimentos?${query.toString()}`;
  };

  return (
    <div className="space-y-4">
      <ProcedimentosView procedimentos={registros} />
      <Pagination
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        total={total}
        hrefDaPagina={hrefDaPagina}
      />
    </div>
  );
}

export default async function ProcedimentosPage({ searchParams }: PageProps) {
  const { pagina, busca } = await searchParams;
  const paginaAtual = Number(pagina ?? "1");

  return (
    <>
      <PageHeader
        titulo="Procedimentos"
        descricao="Servicos oferecidos pela clinica, com valor e duracao padrao."
      />
      <Suspense fallback={<TabelaSkeleton />}>
        <ListaDeProcedimentos
          pagina={Number.isFinite(paginaAtual) ? paginaAtual : 1}
          busca={busca}
        />
      </Suspense>
    </>
  );
}
