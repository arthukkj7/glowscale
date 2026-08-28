import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { TabelaSkeleton } from "@/components/shared/loading-state";
import { ProfissionaisView } from "@/components/profissionais/profissionais-view";
import { listarProfissionais } from "@/lib/data/profissionais";

export const metadata: Metadata = { title: "Profissionais" };

interface PageProps {
  searchParams: Promise<{ pagina?: string; busca?: string }>;
}

async function ListaDeProfissionais({ pagina, busca }: { pagina: number; busca?: string }) {
  const { registros, total, totalPaginas, pagina: paginaAtual } = await listarProfissionais({
    pagina,
    busca,
  });

  const parametros = (novaPagina: number) => {
    const query = new URLSearchParams();
    if (busca) query.set("busca", busca);
    query.set("pagina", String(novaPagina));
    return `/profissionais?${query.toString()}`;
  };

  return (
    <div className="space-y-4">
      <ProfissionaisView profissionais={registros} />
      <Pagination
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        total={total}
        hrefDaPagina={parametros}
      />
    </div>
  );
}

export default async function ProfissionaisPage({ searchParams }: PageProps) {
  const { pagina, busca } = await searchParams;
  const paginaAtual = Number(pagina ?? "1");

  return (
    <>
      <PageHeader
        titulo="Profissionais"
        descricao="Cadastro da equipe, especialidades e percentual de comissao."
      />
      <Suspense fallback={<TabelaSkeleton />}>
        <ListaDeProfissionais
          pagina={Number.isFinite(paginaAtual) ? paginaAtual : 1}
          busca={busca}
        />
      </Suspense>
    </>
  );
}
