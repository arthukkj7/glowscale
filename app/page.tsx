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
import { PublicoAtendido } from "@/components/marketing/publico-atendido";
import { PlanosVitrine } from "@/components/marketing/planos-vitrine";
import { Perguntas } from "@/components/marketing/perguntas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { DIAS_DE_TESTE } from "@/lib/planos";

export const metadata: Metadata = {
  title: `${APP_NAME} - Gestão inteligente para negócios de beleza`,
  description:
    "Sistema de gestão para manicures, nail e lash designers, barbearias, studios e clínicas de estética: agenda, serviços, equipe, comissões e relatório financeiro em um lugar só.",
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
    titulo: "Agenda do dia",
    texto:
      "Hora, cliente, serviço e profissional numa tela só. O sistema recusa dois compromissos no mesmo horário da mesma profissional — não dá para marcar em cima.",
  },
  {
    icone: ClipboardListIcon,
    titulo: "Atendimentos em segundos",
    texto:
      "Escolha a profissional e o serviço: valor e comissão vêm preenchidos, com prévia do repasse antes de salvar.",
  },
  {
    icone: BarChart3Icon,
    titulo: "Relatório financeiro",
    texto:
      "Faturamento, comissões e o que fica para o negócio, consolidados por período e com quebra por profissional.",
  },
  {
    icone: PercentIcon,
    titulo: "A conta sempre fecha",
    texto:
      "Nenhum centavo se perde no arredondamento. O que a profissional recebe mais o que fica para você dá exatamente o valor do atendimento — todo mês, sem conferência manual.",
  },
  {
    icone: ShieldCheckIcon,
    titulo: "Seus dados são só seus",
    texto:
      "Nenhum outro negócio enxerga suas clientes, seus valores ou suas comissões. A separação é feita no banco de dados, não apenas na tela.",
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
              Para negócios de beleza e estética
            </p>
            <h1 className="texto-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Seu negócio de beleza, sob controle.
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Agenda, serviços, equipe, comissões e financeiro em um lugar só. Saiba
              exatamente quanto cada profissional produziu, quanto recebe de comissão e
              quanto fica para você.
            </p>
            <PublicoAtendido />
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

        <section id="planos" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-10 max-w-2xl space-y-3">
            <h2 className="texto-display text-3xl font-semibold tracking-tight">
              Um preço para cada tamanho de negócio
            </h2>
            <p className="text-muted-foreground">
              {DIAS_DE_TESTE} dias para testar sem compromisso. Você só é cobrada depois
              disso, e cancela quando quiser.
            </p>
          </div>
          <PlanosVitrine />
        </section>

        <section className="border-t border-border bg-card/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="texto-display mb-8 text-center text-3xl font-semibold tracking-tight">
              Perguntas frequentes
            </h2>
            <Perguntas />
          </div>
        </section>

      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Logo compacta />
            <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Links do rodapé">
              <Link href="/#planos" className="underline-offset-4 hover:text-foreground hover:underline">
                Planos
              </Link>
              <Link href="/privacidade" className="underline-offset-4 hover:text-foreground hover:underline">
                Privacidade
              </Link>
              <Link href="/termos" className="underline-offset-4 hover:text-foreground hover:underline">
                Termos de uso
              </Link>
              <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
                Entrar
              </Link>
            </nav>
          </div>
          <p className="border-t border-border pt-4">
            &copy; {new Date().getFullYear()} GlowScale. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
