import type { Metadata } from "next";

import { AtendimentosView } from "@/components/atendimentos/atendimentos-view";
import { FiltrosPeriodo } from "@/components/shared/filtros-periodo";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { requireActiveSubscription } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/calculations/money";
import { listarAtendimentos } from "@/lib/data/atendimentos";
import { resumoDoPeriodo } from "@/lib/data/financeiro";
import { listarProcedimentosAtivos } from "@/lib/data/procedimentos";
import { listarProfissionaisAtivas } from "@/lib/data/profissionais";
import { hojeNaClinica } from "@/lib/utils/date";
import { normalizarFiltro, queryComFiltros } from "@/lib/utils/filtros";

export const metadata: Metadata = { title: "Atendimentos" };

interface PageProps {
  searchParams: Promise<{
    pagina?: string;
    dataInicial?: string;
    dataFinal?: string;
    profissionalId?: string;
    status?: string;
  }>;
}

export default async function AtendimentosPage({ searchParams }: PageProps) {
  const parametros = await searchParams;
  const { clinica } = await requireActiveSubscription();

  const hoje = hojeNaClinica(clinica.timezone);
  const filtro = normalizarFiltro(parametros, hoje);
  const paginaSolicitada = Number(parametros.pagina ?? "1");

  const [lista, resumo, profissionais, procedimentos] = await Promise.all([
    listarAtendimentos({
      pagina: Number.isFinite(paginaSolicitada) ? paginaSolicitada : 1,
      dataInicial: filtro.dataInicial,
      dataFinal: filtro.dataFinal,
      profissionalId: filtro.profissionalId ?? undefined,
      status: filtro.status ?? undefined,
    }),
    resumoDoPeriodo({
      dataInicial: filtro.dataInicial,
      dataFinal: filtro.dataFinal,
      profissionalId: filtro.profissionalId,
      status: filtro.status,
    }),
    listarProfissionaisAtivas(),
    listarProcedimentosAtivos(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Atendimentos"
        descricao="Lancamentos realizados, com calculo automatico de comissao e repasse."
      />

      <FiltrosPeriodo
        action="/atendimentos"
        dataInicial={filtro.dataInicial}
        dataFinal={filtro.dataFinal}
        profissionalId={filtro.bruto.profissionalId}
        status={filtro.bruto.status}
        profissionais={profissionais}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          rotulo="Atendimentos no filtro"
          valor={String(resumo.quantidadeAtendimentos)}
        />
        <StatCard rotulo="Faturamento" valor={formatCurrency(resumo.faturamento)} />
        <StatCard rotulo="Comissoes" valor={formatCurrency(resumo.comissoes)} />
        <StatCard rotulo="Repasse da clinica" valor={formatCurrency(resumo.repasseClinica)} />
      </div>

      <AtendimentosView
        atendimentos={lista.registros}
        profissionais={profissionais}
        procedimentos={procedimentos}
        dataPadrao={hoje}
        temFiltroAtivo={filtro.temFiltroAtivo}
      />

      <Pagination
        paginaAtual={lista.pagina}
        totalPaginas={lista.totalPaginas}
        total={lista.total}
        hrefDaPagina={(pagina) =>
          `/atendimentos?${queryComFiltros(filtro, { pagina: String(pagina) })}`
        }
      />
    </>
  );
}
