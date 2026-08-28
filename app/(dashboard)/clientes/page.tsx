import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BuscaClientes } from "@/components/clientes/busca-clientes";
import { ClientesView } from "@/components/clientes/clientes-view";
import { PageHeader } from "@/components/shared/page-header";
import { TabelaSkeleton } from "@/components/shared/loading-state";
import { Button } from "@/components/ui/button";
import { listarClientes } from "@/lib/data/clientes";

export const metadata: Metadata = { title: "Clientes" };

interface PageProps {
  searchParams: Promise<{ pagina?: string; busca?: string }>;
}

async function Lista({ pagina, busca }: { pagina: number; busca?: string }) {
  const { registros, temProxima, pagina: atual } = await listarClientes({ pagina, busca });

  const href = (destino: number) => {
    const query = new URLSearchParams();
    if (busca) query.set("busca", busca);
    query.set("pagina", String(destino));
    return `/clientes?${query.toString()}`;
  };

  return (
    <div className="space-y-4">
      <ClientesView clientes={registros} buscando={Boolean(busca)} />

      {(atual > 1 || temProxima) && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={atual <= 1} asChild={atual > 1}>
            {atual > 1 ? <Link href={href(atual - 1)}>Anterior</Link> : <span>Anterior</span>}
          </Button>
          <span className="text-sm text-muted-foreground">Página {atual}</span>
          <Button variant="outline" size="sm" disabled={!temProxima} asChild={temProxima}>
            {temProxima ? <Link href={href(atual + 1)}>Próxima</Link> : <span>Próxima</span>}
          </Button>
        </div>
      )}
    </div>
  );
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const { pagina, busca } = await searchParams;
  const paginaAtual = Number(pagina ?? "1");

  return (
    <>
      <PageHeader
        titulo="Clientes"
        descricao="Quem já passou por aqui, quanto gastou e quando foi a última vez."
      />
      <div className="space-y-4">
        <BuscaClientes valorInicial={busca} />
        <Suspense key={`${busca ?? ""}-${pagina ?? "1"}`} fallback={<TabelaSkeleton />}>
          <Lista pagina={Number.isFinite(paginaAtual) ? paginaAtual : 1} busca={busca} />
        </Suspense>
      </div>
    </>
  );
}
