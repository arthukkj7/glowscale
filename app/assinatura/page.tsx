import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { CheckoutForm } from "@/components/assinatura/checkout-form";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import {
  StatusAssinaturaBadge,
  StatusClinicaBadge,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { asaasEstaConfigurado } from "@/lib/asaas/config";
import { assinaturaLiberaAcesso, requireSessao } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/calculations/money";
import { PLANO_PADRAO } from "@/lib/constants";
import { serviceRoleDisponivel } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Assinatura",
  robots: { index: false, follow: false },
};

/**
 * Pagina de assinatura. Acessivel mesmo com a assinatura irregular - e
 * justamente onde a cliente regulariza a situacao.
 */
export default async function AssinaturaPage() {
  const { clinica, usuario, assinatura, email } = await requireSessao();
  const acessoLiberado = assinaturaLiberaAcesso(clinica);
  const integracaoDisponivel = asaasEstaConfigurado() && serviceRoleDisponivel();

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
        <Logo />
        <UserMenu nome={usuario.nome} email={email} />
      </header>

      <main id="conteudo" className="flex-1 px-4 py-10 sm:px-6">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="space-y-2">
            <h1 className="texto-display text-3xl font-semibold tracking-tight">
              Assinatura GlowScale
            </h1>
            <p className="text-muted-foreground">
              {acessoLiberado
                ? "Sua clinica esta com acesso liberado. Abaixo estao os detalhes do plano."
                : "Conclua a assinatura para liberar o painel da sua clinica."}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Plano {PLANO_PADRAO.nome}</CardTitle>
                <CardDescription>{PLANO_PADRAO.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="flex items-baseline gap-1.5">
                  <span className="texto-display text-4xl font-semibold">
                    {formatCurrency(PLANO_PADRAO.valor)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ mes</span>
                </p>

                <ul className="space-y-2.5 text-sm">
                  {PLANO_PADRAO.beneficios.map((beneficio) => (
                    <li key={beneficio} className="flex gap-2.5">
                      <CheckIcon
                        className="mt-0.5 size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{beneficio}</span>
                    </li>
                  ))}
                </ul>

                <dl className="space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Clinica</dt>
                    <dd className="truncate font-medium">{clinica.nome}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Situacao da conta</dt>
                    <dd>
                      <StatusClinicaBadge status={clinica.status} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Assinatura</dt>
                    <dd>
                      {assinatura ? (
                        <StatusAssinaturaBadge status={assinatura.status} />
                      ) : (
                        <span className="text-muted-foreground">Nao iniciada</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagamento</CardTitle>
                <CardDescription>
                  Cobranca recorrente processada pelo Asaas. Os dados do cartao nunca passam
                  pelo GlowScale.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <CheckoutForm
                  documentoAtual={clinica.documento}
                  telefoneAtual={clinica.telefone}
                  urlPagamentoAtual={assinatura?.url_pagamento ?? null}
                  assinaturaIniciada={Boolean(assinatura?.asaas_subscription_id)}
                  integracaoDisponivel={integracaoDisponivel}
                />

                {acessoLiberado ? (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard">Ir para o painel</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
