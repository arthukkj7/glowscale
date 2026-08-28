import type { Metadata } from "next";
import { BarChart3Icon } from "lucide-react";

import { DataTable, type ColunaTabela } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { FiltrosPeriodo } from "@/components/shared/filtros-periodo";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card } from "@/components/ui/card";
import { TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { requireActiveSubscription } from "@/lib/auth/session";
import { formatCurrency, formatPercent } from "@/lib/calculations/money";
import {
  relatorioPorProfissional,
  resumoDoPeriodo,
  totalizarLinhas,
  type LinhaRelatorio,
} from "@/lib/data/financeiro";
import { listarProfissionaisAtivas } from "@/lib/data/profissionais";
import { formatDateBR, hojeNaClinica } from "@/lib/utils/date";
import { normalizarFiltro } from "@/lib/utils/filtros";

export const metadata: Metadata = { title: "Financeiro" };

interface PageProps {
  searchParams: Promise<{
    dataInicial?: string;
    dataFinal?: string;
    profissionalId?: string;
    status?: string;
  }>;
}

export default async function FinanceiroPage({ searchParams }: PageProps) {
  const parametros = await searchParams;
  const { clinica } = await requireActiveSubscription();

  const hoje = hojeNaClinica(clinica.timezone);
  const filtro = normalizarFiltro(parametros, hoje);

  const consulta = {
    dataInicial: filtro.dataInicial,
    dataFinal: filtro.dataFinal,
    profissionalId: filtro.profissionalId,
    status: filtro.status,
  };

  const [resumo, linhas, profissionais] = await Promise.all([
    resumoDoPeriodo(consulta),
    relatorioPorProfissional(consulta),
    listarProfissionaisAtivas(),
  ]);

  const totais = totalizarLinhas(linhas);

  const colunas: ColunaTabela<LinhaRelatorio>[] = [
    {
      chave: "profissional",
      cabecalho: "Profissional",
      celula: (linha) => <span className="font-medium">{linha.profissionalNome}</span>,
    },
    {
      chave: "quantidade",
      cabecalho: "Atendimentos",
      alinhamento: "direita",
      celula: (linha) => linha.quantidade,
    },
    {
      chave: "faturamento",
      cabecalho: "Faturamento",
      alinhamento: "direita",
      celula: (linha) => formatCurrency(linha.faturamento),
    },
    {
      chave: "percentual",
      cabecalho: "Comissão %",
      alinhamento: "direita",
      apenasDesktop: true,
      celula: (linha) => formatPercent(linha.comissaoPercentualMedia),
    },
    {
      chave: "comissao",
      cabecalho: "Comissão",
      alinhamento: "direita",
      celula: (linha) => formatCurrency(linha.comissao),
    },
    {
      chave: "clinica",
      cabecalho: "Valor clínica",
      alinhamento: "direita",
      celula: (linha) => (
        <span className="font-medium">{formatCurrency(linha.valorClinica)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Financeiro"
        descricao={`Consolidado de ${formatDateBR(filtro.dataInicial)} a ${formatDateBR(filtro.dataFinal)}.`}
      />

      <FiltrosPeriodo
        action="/financeiro"
        dataInicial={filtro.dataInicial}
        dataFinal={filtro.dataFinal}
        profissionalId={filtro.bruto.profissionalId}
        status={filtro.bruto.status}
        profissionais={profissionais}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          rotulo="Faturamento total"
          valor={formatCurrency(resumo.faturamento)}
          destaque="primario"
        />
        <StatCard rotulo="Total de comissões" valor={formatCurrency(resumo.comissoes)} />
        <StatCard
          rotulo="Total da clínica"
          valor={formatCurrency(resumo.repasseClinica)}
          destaque="sucesso"
        />
        <StatCard
          rotulo="Atendimentos"
          valor={String(resumo.quantidadeAtendimentos)}
          detalhe="No período filtrado"
        />
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          icone={BarChart3Icon}
          titulo="Nenhum atendimento neste período"
          descricao="Ajuste o filtro de datas ou registre atendimentos para ver o consolidado por profissional."
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            colunas={colunas}
            registros={linhas}
            chaveDoRegistro={(linha) => linha.profissionalId}
            rodape={
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {totais.quantidade}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(totais.faturamento)}
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell" />
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(totais.comissao)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(totais.valorClinica)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            }
          />
        </Card>
      )}
    </>
  );
}
