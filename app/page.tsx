import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  ClipboardListIcon,
  PercentIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_DESCRIPTION, APP_NAME, PLANO_PADRAO } from "@/lib/constants";
import { formatCurrency } from "@/lib/calculations/money";

export const metadata: Metadata = {
  title: `${APP_NAME} - Escalas, atendimentos e comissões sob controle`,
  description:
    "Software de gestão para clínicas de estética: escala semanal, lançamento de atendimentos, cálculo automático de comissão e relatório financeiro por profissional.",
  alternates: { canonical: "/" },
};

const recursos = [
  {
    icone: UsersIcon,
    titulo: "Profissionais e comissões",
    texto:
      "Cadastro com especialidade e percentual próprio. Cada atendimento guarda o percentual vigente, então mudar a comissão nunca reescreve o passado.",
  },
  {
    icone: CalendarDaysIcon,
    titulo: "Escala semanal",
    texto:
      "Grade de segunda a domingo com múltiplos turnos por profissional, navegacao entre semanas e visao em cards no celular.",
  },
  {
    icone: ClipboardListIcon,
    titulo: "Atendimentos em segundos",
    texto:
      "Escolha a profissional e o procedimento: valor e comissão vem preenchidos, com prévia do repasse antes de salvar.",
  },
  {
    icone: BarChart3Icon,
    titulo: "Relatório financeiro",
    texto:
      "Faturamento, comissões e repasse da clínica consolidados por período, com quebra por profissional.",
  },
  {
    icone: PercentIcon,
    titulo: "Números que fecham",
    texto:
      "Valores em numeric no banco e cálculo em centavos na aplicacao. Nada de centavo perdido em arredondamento.",
  },
  {
    icone: ShieldCheckIcon,
    titulo: "Dados isolados por clínica",
    texto:
      "Isolamento multi-tenant garantido por Row Level Security no próprio PostgreSQL, não apenas pela interface.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Acesso">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/cadastro">Criar conta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Para clínicas de estética
            </p>
            <h1 className="texto-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Escalas, atendimentos e comissões sob controle.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              {APP_DESCRIPTION} Saiba exatamente quanto cada profissional produziu, quanto
              recebe de comissão e quanto fica para a clínica.
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/cadastro">Começar agora</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
            {recursos.map(({ icone: Icone, titulo, texto }) => (
              <Card key={titulo} className="space-y-3 border-transparent bg-transparent p-6 shadow-none">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <Icone className="size-5" />
                </span>
                <h2 className="font-semibold">{titulo}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{texto}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <h2 className="texto-display text-3xl font-semibold tracking-tight">
                Um plano, tudo incluso
              </h2>
              <p className="text-muted-foreground">
                Sem limite de profissionais, procedimentos ou lançamentos. Cobrança recorrente
                por PIX, cartão ou boleto atraves do Asaas.
              </p>
            </div>
            <Card className="p-8">
              <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Plano {PLANO_PADRAO.nome}
              </p>
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="texto-display text-4xl font-semibold">
                  {formatCurrency(PLANO_PADRAO.valor)}
                </span>
                <span className="text-sm text-muted-foreground">/ mes</span>
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {PLANO_PADRAO.beneficios.map((beneficio) => (
                  <li key={beneficio} className="flex gap-2.5 text-muted-foreground">
                    <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {beneficio}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 w-full" size="lg" asChild>
                <Link href="/cadastro">Criar minha conta</Link>
              </Button>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo compacta />
          <p>&copy; {new Date().getFullYear()} GlowScale. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
