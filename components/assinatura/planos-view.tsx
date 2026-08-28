"use client";

import { CheckIcon, CreditCardIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  abrirPortalStripe,
  iniciarCheckoutStripe,
  sincronizarAssinaturaStripe,
} from "@/lib/actions/assinatura-stripe";
import { formatCurrency } from "@/lib/calculations/money";
import { DIAS_DE_TESTE, PLANOS, type PlanoPago } from "@/lib/planos";
import { cn } from "@/lib/utils";

interface PlanosViewProps {
  /** Planos com preco configurado nesta instalacao. */
  disponiveis: PlanoPago[];
  planoAtual: string;
  /** Ja concluiu um checkout: mostra portal e sincronizacao. */
  assinaturaIniciada: boolean;
  temCadastroDeCobranca: boolean;
  emProducao: boolean;
  diasRestantes: number | null;
  testeVencido: boolean;
}

/** Lista de beneficios de um plano, montada a partir da propria definicao. */
function beneficios(plano: PlanoPago, t: ReturnType<typeof useTranslations>): string[] {
  const { limites, recursos } = PLANOS[plano];
  const linhas: string[] = [];

  linhas.push(
    limites.profissionais === null
      ? t("recursos.profissionaisIlimitados")
      : limites.profissionais === 1
        ? t("recursos.profissional_um")
        : t("recursos.profissionais", { limite: limites.profissionais }),
  );
  linhas.push(
    limites.usuarios === null
      ? t("recursos.usuariosIlimitados")
      : limites.usuarios === 1
        ? t("recursos.usuario_um")
        : t("recursos.usuarios", { limite: limites.usuarios }),
  );
  linhas.push(
    limites.clientes === null
      ? t("recursos.clientesIlimitados")
      : t("recursos.clientes", { limite: limites.clientes.toLocaleString() }),
  );

  linhas.push(t("recursos.agenda"));
  linhas.push(t("recursos.servicos"));
  linhas.push(t("recursos.comissoes"));

  if (recursos.reativacao) linhas.push(t("recursos.reativacao"));
  if (recursos.relatorio_profissional) linhas.push(t("recursos.relatorioProfissional"));
  if (recursos.exportar) linhas.push(t("recursos.exportar"));

  return linhas;
}

export function PlanosView({
  disponiveis,
  planoAtual,
  assinaturaIniciada,
  temCadastroDeCobranca,
  emProducao,
  diasRestantes,
  testeVencido,
}: PlanosViewProps) {
  const t = useTranslations("planos");
  const router = useRouter();
  const [assinando, setAssinando] = useState<PlanoPago | null>(null);
  const [sincronizando, startSincronizacao] = useTransition();
  const [abrindoPortal, startPortal] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  function assinar(plano: PlanoPago) {
    setErroGeral(null);
    setAssinando(plano);
    void (async () => {
      const resultado = await iniciarCheckoutStripe({ plano });
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        setAssinando(null);
        return;
      }
      // Navegacao de saida: manter o spinner evita o botao piscar ativo
      // durante o redirecionamento.
      window.location.assign(resultado.data.url);
    })();
  }

  function abrirPortal() {
    setErroGeral(null);
    startPortal(async () => {
      const resultado = await abrirPortalStripe();
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      window.location.assign(resultado.data.url);
    });
  }

  function sincronizar() {
    startSincronizacao(async () => {
      const resultado = await sincronizarAssinaturaStripe();
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "");
      router.refresh();
    });
  }

  if (disponiveis.length === 0) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">{t("semConfiguracao")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {testeVencido ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-medium text-destructive">{t("testeVencido")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("testeVencidoTexto")}</p>
        </div>
      ) : diasRestantes !== null ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <strong className="text-foreground">
            {diasRestantes <= 1
              ? t("testeUltimoDia")
              : t("testeRestante", { dias: `${diasRestantes} dias` })}
          </strong>
        </div>
      ) : null}

      {!emProducao ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
          {t("modoTeste")}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {disponiveis.map((id) => {
          const plano = PLANOS[id];
          const atual = planoAtual === id;
          const carregando = assinando === id;

          return (
            <Card
              key={id}
              className={cn(
                "relative flex flex-col p-6",
                plano.destaque && "border-primary/50 shadow-lg shadow-primary/5",
                atual && "border-success/60",
              )}
            >
              {plano.destaque && !atual ? (
                <Badge className="absolute -top-2.5 left-6">{t("maisEscolhido")}</Badge>
              ) : null}
              {atual ? (
                <Badge variant="outline" className="absolute -top-2.5 left-6 bg-card">
                  {t("planoAtual")}
                </Badge>
              ) : null}

              <h3 className="texto-display text-xl font-semibold">{plano.nome}</h3>

              <p className="mt-3 flex items-baseline gap-1">
                <span className="texto-display text-4xl font-semibold">
                  {formatCurrency(plano.precoMensal)}
                </span>
                <span className="text-sm text-muted-foreground">{t("porMes")}</span>
              </p>

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {beneficios(id, t).map((linha) => (
                  <li key={linha} className="flex gap-2.5">
                    <CheckIcon
                      className="mt-0.5 size-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{linha}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={plano.destaque ? "default" : "outline"}
                disabled={assinando !== null || atual}
                onClick={() => assinar(id)}
              >
                {carregando ? (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCardIcon className="size-4" aria-hidden="true" />
                )}
                {atual
                  ? t("planoAtual")
                  : testeVencido
                    ? t("assinarSemTeste", { plano: plano.nome })
                    : t("assinar", { dias: DIAS_DE_TESTE })}
              </Button>
            </Card>
          );
        })}
      </div>

      {erroGeral ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroGeral}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {assinaturaIniciada ? (
          <Button variant="outline" onClick={sincronizar} disabled={sincronizando}>
            {sincronizando ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCwIcon className="size-4" aria-hidden="true" />
            )}
            {t("atualizarSituacao")}
          </Button>
        ) : null}

        {temCadastroDeCobranca ? (
          <Button variant="ghost" onClick={abrirPortal} disabled={abrindoPortal}>
            {abrindoPortal ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ExternalLinkIcon className="size-4" aria-hidden="true" />
            )}
            {t("gerenciar")}
          </Button>
        ) : null}
      </div>

      <p className="text-center text-xs text-muted-foreground">{t("pagamentoSeguro")}</p>
    </div>
  );
}
