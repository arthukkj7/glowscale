"use client";

import { CreditCardIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  abrirPortalStripe,
  iniciarCheckoutStripe,
  sincronizarAssinaturaStripe,
} from "@/lib/actions/assinatura-stripe";

interface StripeCheckoutProps {
  /** A clinica ja concluiu um checkout (existe subscription no Stripe). */
  assinaturaIniciada: boolean;
  /** Ja existe cadastro de cobranca, entao o portal pode ser aberto. */
  temCadastroDeCobranca: boolean;
  integracaoDisponivel: boolean;
  /** Avisa que a cobranca e real, nao um teste. */
  emProducao: boolean;
}

export function StripeCheckout({
  assinaturaIniciada,
  temCadastroDeCobranca,
  integracaoDisponivel,
  emProducao,
}: StripeCheckoutProps) {
  const router = useRouter();
  const [assinando, startAssinatura] = useTransition();
  const [sincronizando, startSincronizacao] = useTransition();
  const [abrindoPortal, startPortal] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  function aoAssinar() {
    setErroGeral(null);
    startAssinatura(async () => {
      const resultado = await iniciarCheckoutStripe();
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      // Navegacao de saida para o dominio do Stripe: assign() preserva o
      // historico, entao "voltar" traz a pessoa de volta para ca.
      window.location.assign(resultado.data.url);
    });
  }

  function aoAbrirPortal() {
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

  function aoSincronizar() {
    startSincronizacao(async () => {
      const resultado = await sincronizarAssinaturaStripe();
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Situação atualizada.");
      router.refresh();
    });
  }

  if (!integracaoDisponivel) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">Cobrança ainda não configurada nesta instalação.</p>
        <p className="mt-1 text-muted-foreground">
          Configure <code className="font-mono text-xs">STRIPE_SECRET_KEY</code>,{" "}
          <code className="font-mono text-xs">STRIPE_PRICE_ID</code>,{" "}
          <code className="font-mono text-xs">STRIPE_WEBHOOK_SECRET</code> e{" "}
          <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> no servidor.
          O restante do sistema continua funcionando durante o período de teste.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!emProducao ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">Modo de teste.</strong> Nenhuma cobrança real
          acontece. Use o cartão <code className="font-mono">4242 4242 4242 4242</code>, uma
          validade futura e qualquer CVC.
        </p>
      ) : null}

      {!assinaturaIniciada ? (
        <Button size="lg" className="w-full" onClick={aoAssinar} disabled={assinando}>
          {assinando ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CreditCardIcon className="size-4" aria-hidden="true" />
          )}
          Assinar agora
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={aoSincronizar}
          disabled={sincronizando}
        >
          {sincronizando ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCwIcon className="size-4" aria-hidden="true" />
          )}
          Atualizar situação da assinatura
        </Button>
      )}

      {temCadastroDeCobranca ? (
        <Button
          variant="ghost"
          className="w-full"
          onClick={aoAbrirPortal}
          disabled={abrindoPortal}
        >
          {abrindoPortal ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLinkIcon className="size-4" aria-hidden="true" />
          )}
          Gerenciar pagamento e faturas
        </Button>
      ) : null}

      {erroGeral ? (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {erroGeral}
        </p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Pagamento processado pelo Stripe. Os dados do cartão nunca passam pelo GlowScale.
      </p>
    </div>
  );
}
