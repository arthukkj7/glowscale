import type { Metadata } from "next";
import Link from "next/link";

import { ClinicaForm } from "@/components/configuracoes/clinica-form";
import { PageHeader } from "@/components/shared/page-header";
import {
  StatusAssinaturaBadge,
  StatusClinicaBadge,
} from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { podeAdministrar, requireActiveSubscription } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/calculations/money";
import { PLANO_PADRAO } from "@/lib/constants";
import { formatDateBR } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Configuracoes" };

export default async function ConfiguracoesPage() {
  const { clinica, usuario, assinatura, email } = await requireActiveSubscription();
  const administrador = podeAdministrar(usuario);

  return (
    <>
      <PageHeader
        titulo="Configuracoes"
        descricao="Dados cadastrais da clinica e situacao da assinatura."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Dados da clinica</CardTitle>
            <CardDescription>
              Estas informacoes aparecem no painel e sao usadas na cobranca.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClinicaForm clinica={clinica} somenteLeitura={!administrador} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assinatura</CardTitle>
              <CardDescription>Plano contratado e situacao atual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Plano</dt>
                  <dd className="font-medium">{PLANO_PADRAO.nome}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Valor mensal</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(assinatura?.valor || PLANO_PADRAO.valor)}
                  </dd>
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
                {assinatura?.data_inicio ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Inicio</dt>
                    <dd className="tabular-nums">{formatDateBR(assinatura.data_inicio)}</dd>
                  </div>
                ) : null}
              </dl>

              <Separator />

              <Button variant="outline" className="w-full" asChild>
                <Link href="/assinatura">Gerenciar assinatura</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seu acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Nome</dt>
                  <dd className="truncate font-medium">{usuario.nome}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">E-mail</dt>
                  <dd className="truncate">{email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Perfil</dt>
                  <dd className="font-medium capitalize">{usuario.role}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Fuso horario</dt>
                  <dd>{clinica.timezone}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
