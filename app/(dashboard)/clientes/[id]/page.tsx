import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CakeIcon, PhoneIcon, MailIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusAtivoBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations/money";
import { buscarCliente, historicoDoCliente, resumoDoCliente } from "@/lib/data/clientes";
import { formatDateBR } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Cliente" };

interface PageProps {
  params: Promise<{ id: string }>;
}

/** Dias corridos desde a data, em UTC, para nao escorregar por fuso. */
function diasDesde(dataISO: string): number {
  const entao = new Date(`${dataISO}T12:00:00Z`).getTime();
  const hoje = new Date().getTime();
  return Math.floor((hoje - entao) / 86_400_000);
}

export default async function ClientePage({ params }: PageProps) {
  const { id } = await params;

  // buscarCliente ja filtra por clinica_id: um id de outro negocio vira 404,
  // nao "acesso negado" - que confirmaria que o registro existe.
  const cliente = await buscarCliente(id);
  if (!cliente) notFound();

  const [resumo, historico] = await Promise.all([
    resumoDoCliente(id),
    historicoDoCliente(id),
  ]);

  const dias = resumo?.ultimo_atendimento ? diasDesde(resumo.ultimo_atendimento) : null;

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clientes">
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Clientes
          </Link>
        </Button>
      </div>

      <PageHeader
        titulo={cliente.nome}
        descricao={
          dias === null
            ? "Ainda sem atendimentos registrados."
            : dias === 0
              ? "Atendida hoje."
              : `Último atendimento há ${dias} ${dias === 1 ? "dia" : "dias"}.`
        }
      />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="space-y-1 pt-6">
              <p className="text-sm text-muted-foreground">Total gasto</p>
              <p className="texto-display text-2xl font-semibold tabular-nums">
                {formatCurrency(resumo?.total_gasto ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 pt-6">
              <p className="text-sm text-muted-foreground">Atendimentos</p>
              <p className="texto-display text-2xl font-semibold tabular-nums">
                {resumo?.total_atendimentos ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-1 pt-6">
              <p className="text-sm text-muted-foreground">Profissional preferida</p>
              <p className="truncate text-lg font-medium">
                {resumo?.profissional_preferida ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Cadastro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Situação</span>
                <StatusAtivoBadge ativo={cliente.ativo} />
              </div>
              {cliente.telefone ? (
                <div className="flex items-center gap-2">
                  <PhoneIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>{cliente.telefone}</span>
                </div>
              ) : null}
              {cliente.email ? (
                <div className="flex items-center gap-2">
                  <MailIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{cliente.email}</span>
                </div>
              ) : null}
              {cliente.data_nascimento ? (
                <div className="flex items-center gap-2">
                  <CakeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>{formatDateBR(cliente.data_nascimento)}</span>
                </div>
              ) : null}
              {cliente.observacoes ? (
                <div className="space-y-1 border-t border-border pt-3">
                  <p className="text-muted-foreground">Observações</p>
                  <p className="whitespace-pre-wrap">{cliente.observacoes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {historico.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum atendimento lançado para esta cliente ainda.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {historico.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0">
                      <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatDateBR(item.data_atendimento)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.servico ?? "Serviço removido"}
                          {item.quantidade > 1 ? ` (${item.quantidade}x)` : ""}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.profissional ?? "—"}
                        </p>
                      </div>
                      {item.status === "cancelado" ? (
                        <Badge variant="outline" className="shrink-0">
                          Cancelado
                        </Badge>
                      ) : null}
                      <span
                        className={
                          "shrink-0 text-sm font-medium tabular-nums " +
                          (item.status === "cancelado"
                            ? "text-muted-foreground line-through"
                            : "")
                        }
                      >
                        {formatCurrency(item.valor_total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
