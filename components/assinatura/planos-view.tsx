"use client";

import { CheckIcon, CreditCardIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
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
import { DIAS_DE_TESTE, OFERTAS, ORDEM_DAS_OFERTAS, type OfertaPaga } from "@/lib/planos";
import {
  PARA_QUEM,
  VANTAGEM,
  beneficiosDoNivel,
  equivalenciaMensal,
} from "@/lib/planos/beneficios";
import { cn } from "@/lib/utils";

interface PlanosViewProps {
  /** Ofertas com preço configurado nesta instalação. */
  disponiveis: OfertaPaga[];
  /** Nível de acesso que vale agora: "trial", "free" ou "pro". */
  nivelAtual: string;
  assinaturaIniciada: boolean;
  temCadastroDeCobranca: boolean;
  emProducao: boolean;
  diasRestantes: number | null;
  /** O teste acabou e o negócio caiu para o gratuito. */
  caiuParaGratuito: boolean;
}

export function PlanosView({
  disponiveis,
  nivelAtual,
  assinaturaIniciada,
  temCadastroDeCobranca,
  emProducao,
  diasRestantes,
  caiuParaGratuito,
}: PlanosViewProps) {
  const router = useRouter();
  const [assinando, setAssinando] = useState<OfertaPaga | null>(null);
  const [sincronizando, startSincronizacao] = useTransition();
  const [abrindoPortal, startPortal] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  function assinar(oferta: OfertaPaga) {
    setErroGeral(null);
    setAssinando(oferta);
    void (async () => {
      const resultado = await iniciarCheckoutStripe({ oferta });
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        setAssinando(null);
        return;
      }
      // Navegação de saída: manter o spinner evita o botão piscar ativo.
      window.location.assign(resultado.data.url);
    })();
  }

  function abrirPortal() {
    setErroGeral(null);
    startPortal(async () => {
      const resultado = await abrirPortalStripe();
      if (!resultado.ok) return setErroGeral(resultado.erro);
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

  return (
    <div className="space-y-6">
      {caiuParaGratuito ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="font-medium">Seu período de teste terminou</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Você continua no GlowScale, agora no plano Free. Nada foi apagado — o que passou
            do limite gratuito continua guardado, só não dá para adicionar mais.
          </p>
        </div>
      ) : diasRestantes !== null ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <strong className="text-foreground">
            {diasRestantes <= 1
              ? "Último dia de teste"
              : `${diasRestantes} dias de teste restantes`}
          </strong>
          <span className="ml-1 text-muted-foreground">
            — depois seu acesso continua no plano Free.
          </span>
        </div>
      ) : null}

      {!emProducao ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
          Modo de teste. Nenhuma cobrança real acontece. Use o cartão 4242 4242 4242 4242,
          validade futura e qualquer CVC.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {ORDEM_DAS_OFERTAS.map((id) => {
          const oferta = OFERTAS[id];
          const gratuito = id === "free";
          const atual = nivelAtual === oferta.nivel && (gratuito || assinaturaIniciada);
          const carregando = assinando === id;
          const aVenda = gratuito || disponiveis.includes(id as OfertaPaga);

          return (
            <Card
              key={id}
              className={cn(
                "relative flex flex-col p-6",
                oferta.destaque && "border-primary/50 shadow-lg shadow-primary/5",
                atual && "border-success/60",
              )}
            >
              {atual ? (
                <Badge variant="outline" className="absolute -top-2.5 left-6 bg-card">
                  Seu plano
                </Badge>
              ) : oferta.destaque ? (
                <Badge className="absolute -top-2.5 left-6">Melhor valor</Badge>
              ) : null}

              <h3 className="texto-display text-xl font-semibold">{oferta.nome}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{PARA_QUEM[id]}</p>

              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="texto-display text-3xl font-semibold">
                  {gratuito ? "R$ 0" : formatCurrency(oferta.preco)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {gratuito ? "para sempre" : oferta.periodo === "ano" ? "/ ano" : "/ mês"}
                </span>
              </p>
              <p className="mt-1 h-5 text-sm text-muted-foreground">
                {equivalenciaMensal(id) ?? ""}
              </p>

              {VANTAGEM[id] ? (
                <p
                  className={cn(
                    "mt-3 rounded-md px-3 py-2 text-sm",
                    oferta.destaque
                      ? "bg-success/12 font-medium text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {VANTAGEM[id]}
                </p>
              ) : null}

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {beneficiosDoNivel(oferta.nivel).map((linha) => (
                  <li key={linha} className="flex gap-2.5">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    <span className="text-muted-foreground">{linha}</span>
                  </li>
                ))}
              </ul>

              {gratuito ? (
                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {atual ? "É onde você está agora" : "Incluído em qualquer momento"}
                </p>
              ) : (
                <Button
                  className="mt-6 w-full"
                  variant={oferta.destaque ? "default" : "outline"}
                  disabled={assinando !== null || atual || !aVenda}
                  onClick={() => assinar(id as OfertaPaga)}
                >
                  {carregando ? (
                    <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <CreditCardIcon className="size-4" aria-hidden="true" />
                  )}
                  {atual
                    ? "Seu plano"
                    : !aVenda
                      ? "Indisponível"
                      : caiuParaGratuito
                        ? `Assinar ${oferta.nome}`
                        : `Testar ${DIAS_DE_TESTE} dias grátis`}
                </Button>
              )}
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
            Atualizar situação da assinatura
          </Button>
        ) : null}

        {temCadastroDeCobranca ? (
          <Button variant="ghost" onClick={abrirPortal} disabled={abrindoPortal}>
            {abrindoPortal ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ExternalLinkIcon className="size-4" aria-hidden="true" />
            )}
            Gerenciar pagamento e faturas
          </Button>
        ) : null}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Pagamento processado pelo Stripe. Os dados do cartão nunca passam pelo GlowScale.
      </p>
    </div>
  );
}
