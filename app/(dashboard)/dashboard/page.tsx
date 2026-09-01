import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CakeIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  CrownIcon,
  PlusIcon,
  RepeatIcon,
  TicketIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserRoundIcon,
} from "lucide-react";

import { BotaoWhatsApp } from "@/components/shared/botao-whatsapp";
import { EscolherSegmento } from "@/components/onboarding/escolher-segmento";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

import { requireActiveSubscription } from "@/lib/auth/session";
import { formatCurrency, formatPercent } from "@/lib/calculations/money";
import { AGENDAMENTO_STATUS_LABEL } from "@/lib/constants";
import { carregarPainel, DIAS_DE_ANIVERSARIO, DIAS_PARA_REATIVAR } from "@/lib/data/painel";
import { conviteParaRetorno, felizAniversario } from "@/lib/whatsapp/mensagens";
import { chaveDaSaudacao, formatDateLong } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Painel" };

export default async function DashboardPage() {
  const { usuario, clinica } = await requireActiveSubscription();
  const [dados, t] = await Promise.all([carregarPainel(), getTranslations("painel")]);

  const primeiroNome = usuario.nome.split(" ")[0] ?? usuario.nome;
  const instalacaoVazia = dados.profissionaisAtivas === 0 && dados.procedimentosAtivos === 0;

  const agendaAtiva = dados.agendaDeHoje.filter((a) => a.status !== "cancelado");
  const variacao = dados.variacaoFaturamento;

  return (
    <>
      <PageHeader
        titulo={`${t(chaveDaSaudacao(clinica.timezone))}, ${primeiroNome}`}
        descricao={formatDateLong(dados.hoje)}
        acoes={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/agenda">
                <CalendarPlusIcon className="size-4" aria-hidden="true" />
                {t("agendar")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/atendimentos">
                <PlusIcon className="size-4" aria-hidden="true" />
                {t("lancarAtendimento")}
              </Link>
            </Button>
          </div>
        }
      />

      {instalacaoVazia ? (
        <Card className="p-6">
          <h2 className="texto-display text-xl font-semibold tracking-tight">{t("bemVinda")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Qual é o seu negócio? A gente já deixa os serviços mais comuns cadastrados — assim
            você começa a marcar em vez de preencher formulário.
          </p>
          <div className="mt-6">
            <EscolherSegmento tipoAtual={clinica.tipo_negocio} />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          rotulo={t("faturamentoDoMes")}
          valor={formatCurrency(dados.resumo.faturamento)}
          detalhe={
            variacao === null
              ? t("primeiroMes")
              : t("sobreMesAnterior", {
                  variacao: `${variacao >= 0 ? "+" : ""}${formatPercent(Math.round(variacao * 10) / 10)}`,
                })
          }
          icone={variacao !== null && variacao < 0 ? TrendingDownIcon : TrendingUpIcon}
          destaque={variacao !== null && variacao < 0 ? "alerta" : "primario"}
        />
        <StatCard
          rotulo={t("agendamentosNoMes")}
          valor={String(dados.agendamentosNoMes)}
          detalhe={
            agendaAtiva.length === 0
              ? t("nadaHoje")
              : t("quantosHoje", { quantidade: agendaAtiva.length })
          }
          icone={CalendarDaysIcon}
        />
        <StatCard
          rotulo={t("clientes")}
          valor={String(dados.totalDeClientes)}
          detalhe={
            dados.clientesNovosNoMes === 0
              ? t("nenhumCadastroNovo")
              : t("novosNoMes", { quantidade: dados.clientesNovosNoMes })
          }
          icone={UserRoundIcon}
          destaque={dados.clientesNovosNoMes > 0 ? "sucesso" : "neutro"}
        />

        {/* O repasse estava num cartao tracejado no rodape, com cara de nota
            de rodape. E a pergunta que a dona do negocio faz todo mes -
            "quanto eu devo pagar para a equipe" - e agora esta onde ela olha
            primeiro. */}
        <StatCard
          rotulo={t("comissoesARepassarCurto")}
          valor={formatCurrency(dados.resumo.comissoes)}
          detalhe={t("ficaParaVoceDetalhe", {
            valor: formatCurrency(dados.resumo.repasseClinica),
          })}
          icone={BanknoteIcon}
          destaque="alerta"
        />

        {/* Ticket medio e taxa de retorno respondem as duas perguntas que
            faturamento sozinho nao responde: quanto entra por vez que alguem
            senta na cadeira, e quantas dessas pessoas ja conheciam o lugar. */}
        <StatCard
          rotulo={t("ticketMedio")}
          valor={formatCurrency(dados.metricas.ticket_medio)}
          detalhe={t("porAtendimento")}
          icone={TicketIcon}
        />
        <StatCard
          rotulo={t("taxaDeRetorno")}
          valor={`${dados.metricas.taxa_de_retorno}%`}
          detalhe={
            dados.metricas.clientes_atendidos === 0
              ? t("jaConheciam")
              : t("novasENovas", {
                  novos: dados.metricas.clientes_novos,
                  recorrentes: dados.metricas.clientes_recorrentes,
                })
          }
          icone={RepeatIcon}
          destaque={dados.metricas.taxa_de_retorno >= 50 ? "sucesso" : "neutro"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle>{t("agendaDeHoje")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/agenda">
                {t("verAgenda")}
                <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {dados.agendaDeHoje.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("semCompromissos")}
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
            <CardTitle>{t("clientesParaReativar")}</CardTitle>
            {dados.clientesInativos.length > 0 ? (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/clientes">
                  {t("verTodos")}
                  <ArrowRightIcon className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {dados.clientesInativos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("ninguemSumiu", { dias: DIAS_PARA_REATIVAR })}
              </p>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted-foreground">
                  {dados.clientesInativos.length === 1
                    ? t("naoVoltou", { quantidade: 1, dias: DIAS_PARA_REATIVAR })
                    : t("naoVoltaram", {
                        quantidade: dados.clientesInativos.length,
                        dias: DIAS_PARA_REATIVAR,
                      })}
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
                          {c.telefone ?? t("semTelefone")} ·{" "}
                          {t("jaGastou", { valor: formatCurrency(c.total_gasto) })}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {c.dias_sem_vir}d
                      </span>
                      {/* A lista deixa de ser informação e vira ação: o
                          convite abre pronto, a um clique. */}
                      <BotaoWhatsApp
                        telefone={c.telefone}
                        rotulo="Chamar"
                        className="shrink-0"
                        mensagem={conviteParaRetorno({
                          clienteNome: c.nome,
                          negocioNome: clinica.nome_fantasia ?? clinica.nome,
                        })}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CakeIcon className="size-4 text-primary" aria-hidden="true" />
              {t("aniversariantes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dados.aniversariantes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("semAniversariantes", { dias: DIAS_DE_ANIVERSARIO })}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {dados.aniversariantes.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/clientes/${a.id}`}
                        className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {a.nome}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.dias_ate === 0 ? t("fazHoje") : t("fazEmDias", { dias: a.dias_ate })} ·{" "}
                        {t("fazAnos", { idade: a.idade })}
                      </p>
                    </div>
                    <BotaoWhatsApp
                      telefone={a.telefone}
                      rotulo={t("parabenizar")}
                      className="shrink-0"
                      mensagem={felizAniversario({
                        clienteNome: a.nome,
                        negocioNome: clinica.nome_fantasia ?? clinica.nome,
                      })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CrownIcon className="size-4 text-primary" aria-hidden="true" />
              {t("clientesVip")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dados.clientesVip.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("semVip")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {dados.clientesVip.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/clientes/${c.id}`}
                        className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {c.nome}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.total_atendimentos}x · {t("ultimos90")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrency(c.total_gasto)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>{t("faturamentoPorProfissional")}</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/financeiro">
              {t("relatorioCompleto")}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {dados.ranking.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("semAtendimentos")}
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
                          {t("emComissao", { valor: formatCurrency(linha.comissao) })}
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

    </>
  );
}
