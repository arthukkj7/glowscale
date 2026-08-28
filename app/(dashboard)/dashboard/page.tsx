import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  PlusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveSubscription } from "@/lib/auth/session";
import { formatCurrency, formatPercent } from "@/lib/calculations/money";
import { AGENDAMENTO_STATUS_LABEL } from "@/lib/constants";
import { carregarPainel, DIAS_PARA_REATIVAR } from "@/lib/data/painel";
import { formatDateLong, saudacaoDoDia } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage() {
  const { usuario, clinica } = await requireActiveSubscription();
  const dados = await carregarPainel();

  const primeiroNome = usuario.nome.split(" ")[0] ?? usuario.nome;
  const instalacaoVazia = dados.profissionaisAtivas === 0 && dados.procedimentosAtivos === 0;

  const agendaAtiva = dados.agendaDeHoje.filter((a) => a.status !== "cancelado");
  const variacao = dados.variacaoFaturamento;

  return (
    <>
      <PageHeader
        titulo={`${saudacaoDoDia(clinica.timezone)}, ${primeiroNome}`}
        descricao={formatDateLong(dados.hoje)}
        acoes={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/agenda">
                <CalendarPlusIcon className="size-4" aria-hidden="true" />
                Agendar
              </Link>
            </Button>
            <Button asChild>
              <Link href="/atendimentos">
                <PlusIcon className="size-4" aria-hidden="true" />
                Lançar atendimento
              </Link>
            </Button>
          </div>
        }
      />

      {instalacaoVazia ? (
        <EmptyState
          icone={UsersIcon}
          titulo="Bem-vinda ao GlowScale"
          descricao="Comece cadastrando quem atende e o que você oferece. Depois é só marcar na agenda e lançar os atendimentos — a comissão sai sozinha."
          acao={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/profissionais">Cadastrar equipe</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/procedimentos">Cadastrar serviços</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          rotulo="Faturamento do mês"
          valor={formatCurrency(dados.resumo.faturamento)}
          detalhe={
            variacao === null
              ? "Primeiro mês com movimento"
              : `${variacao >= 0 ? "+" : ""}${formatPercent(Math.round(variacao * 10) / 10)} sobre o mês anterior`
          }
          icone={variacao !== null && variacao < 0 ? TrendingDownIcon : TrendingUpIcon}
          destaque={variacao !== null && variacao < 0 ? "alerta" : "primario"}
        />
        <StatCard
          rotulo="Agendamentos no mês"
          valor={String(dados.agendamentosNoMes)}
          detalhe={
            agendaAtiva.length === 0
              ? "Nada marcado para hoje"
              : `${agendaAtiva.length} ${agendaAtiva.length === 1 ? "hoje" : "hoje"}`
          }
          icone={CalendarDaysIcon}
        />
        <StatCard
          rotulo="Clientes"
          valor={String(dados.totalDeClientes)}
          detalhe={
            dados.clientesNovosNoMes === 0
              ? "Nenhum cadastro novo este mês"
              : `+${dados.clientesNovosNoMes} este mês`
          }
          icone={UserRoundIcon}
          destaque={dados.clientesNovosNoMes > 0 ? "sucesso" : "neutro"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Agenda de hoje</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/agenda">
                Ver agenda
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dados.agendaDeHoje.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum compromisso marcado para hoje.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {dados.agendaDeHoje.map((a) => (
                  <li
                    key={a.id}
                    className={`flex items-center gap-4 py-3 first:pt-0 last:pb-0 ${
                      a.status === "cancelado" ? "opacity-50" : ""
                    }`}
                  >
                    <span className="texto-display w-12 shrink-0 text-base font-semibold tabular-nums">
                      {a.hora_inicio.slice(0, 5)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {a.cliente_nome ?? (
                          <span className="text-muted-foreground">Encaixe</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.servico_nome} · {a.profissional_nome}
                      </p>
                    </div>
                    {a.status !== "agendado" ? (
                      <Badge variant="outline" className="shrink-0">
                        {AGENDAMENTO_STATUS_LABEL[a.status]}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>Clientes para reativar</CardTitle>
            {dados.clientesInativos.length > 0 ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clientes">
                  Ver todos
                  <ArrowRightIcon className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {dados.clientesInativos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ninguém sumiu. Todas as clientes voltaram nos últimos{" "}
                {DIAS_PARA_REATIVAR} dias.
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {dados.clientesInativos.length}{" "}
                  {dados.clientesInativos.length === 1 ? "cliente não voltou" : "clientes não voltaram"}{" "}
                  há mais de {DIAS_PARA_REATIVAR} dias.
                </p>
                <ul className="divide-y divide-border">
                  {dados.clientesInativos.slice(0, 6).map((c) => (
                    <li key={c.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/clientes/${c.id}`}
                          className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                        >
                          {c.nome}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.telefone ?? "sem telefone"} · já gastou{" "}
                          {formatCurrency(c.total_gasto)}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {c.dias_sem_vir}d
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Faturamento por profissional</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/financeiro">
              Relatório completo
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {dados.ranking.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum atendimento lançado neste mês ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {dados.ranking.map((linha) => {
                // Barra relativa ao primeiro colocado: mostra a distancia entre
                // as profissionais, que e o que interessa aqui.
                const maior = dados.ranking[0]?.faturamento ?? 0;
                const proporcao = maior > 0 ? (linha.faturamento / maior) * 100 : 0;
                return (
                  <li key={linha.profissionalId} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{linha.profissionalNome}</span>
                      <span className="shrink-0 tabular-nums">
                        {formatCurrency(linha.faturamento)}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatCurrency(linha.comissao)} em comissão
                        </span>
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${linha.profissionalNome}: ${formatCurrency(linha.faturamento)}`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(proporcao, 2)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BanknoteIcon className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Comissões a repassar este mês:{" "}
              <strong className="text-foreground tabular-nums">
                {formatCurrency(dados.resumo.comissoes)}
              </strong>
              {" · "}fica para você:{" "}
              <strong className="text-foreground tabular-nums">
                {formatCurrency(dados.resumo.repasseClinica)}
              </strong>
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/financeiro">Ver fechamento</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
