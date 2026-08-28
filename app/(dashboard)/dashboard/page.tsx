import type { Metadata } from "next";
import Link from "next/link";
import {
  BanknoteIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  PercentIcon,
  PlusIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveSubscription } from "@/lib/auth/session";
import { formatCurrency, formatPercent } from "@/lib/calculations/money";
import { carregarDashboard } from "@/lib/data/dashboard";
import { formatDateBR, formatDateShort, formatTurno } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { usuario } = await requireActiveSubscription();
  const dados = await carregarDashboard();

  const semDados =
    dados.resumo.quantidadeAtendimentos === 0 && dados.profissionaisAtivas === 0;

  return (
    <>
      <PageHeader
        titulo={`Ola, ${usuario.nome.split(" ")[0]}`}
        descricao={`Resumo de ${formatDateBR(dados.periodo.inicio)} a ${formatDateBR(dados.periodo.fim)}.`}
        acoes={
          <Button asChild>
            <Link href="/atendimentos">
              <PlusIcon className="size-4" aria-hidden="true" />
              Registrar atendimento
            </Link>
          </Button>
        }
      />

      {semDados ? (
        <EmptyState
          icone={UsersIcon}
          titulo="Bem-vinda ao GlowScale"
          descricao="Comece cadastrando sua equipe e os procedimentos da clínica. Em seguida, monte a escala da semana e registre os atendimentos."
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/profissionais">Cadastrar profissional</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/procedimentos">Cadastrar procedimento</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          rotulo="Faturamento do período"
          valor={formatCurrency(dados.resumo.faturamento)}
          icone={BanknoteIcon}
          destaque="primario"
        />
        <StatCard
          rotulo="Comissões"
          valor={formatCurrency(dados.resumo.comissoes)}
          icone={PercentIcon}
        />
        <StatCard
          rotulo="Repasse da clínica"
          valor={formatCurrency(dados.resumo.repasseClinica)}
          icone={TrendingUpIcon}
          destaque="sucesso"
        />
        <StatCard
          rotulo="Atendimentos"
          valor={String(dados.resumo.quantidadeAtendimentos)}
          detalhe={`${dados.profissionaisAtivas} profissionais ativas - ${dados.procedimentosAtivos} procedimentos`}
          icone={ClipboardListIcon}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Profissionais com maior faturamento</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/financeiro">Ver relatório</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dados.ranking.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum atendimento registrado neste período.
              </p>
            ) : (
              <ol className="space-y-3">
                {dados.ranking.map((linha, indice) => (
                  <li
                    key={linha.profissionalId}
                    className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
                      >
                        {indice + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{linha.profissionalNome}</p>
                        <p className="text-xs text-muted-foreground">
                          {linha.quantidade} atendimentos - comissão{" "}
                          {formatPercent(linha.comissaoPercentualMedia)}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatCurrency(linha.faturamento)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Próximos turnos</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/escala">Ver escala</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dados.proximosTurnos.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CalendarDaysIcon
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  Nenhum turno agendado a partir de hoje.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/escala">Montar escala</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {dados.proximosTurnos.map((turno) => (
                  <li
                    key={turno.id}
                    className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{turno.profissional_nome}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {formatDateShort(turno.data)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {formatTurno(turno.hora_inicio, turno.hora_fim)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
