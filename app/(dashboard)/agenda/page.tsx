import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { AgendaView } from "@/components/agenda/agenda-view";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireActiveSubscription } from "@/lib/auth/session";
import { agendamentosDoDia } from "@/lib/data/agenda";
import { clientesParaSelecao } from "@/lib/data/clientes";
import { listarProcedimentosAtivos } from "@/lib/data/procedimentos";
import { listarProfissionaisAtivas } from "@/lib/data/profissionais";
import { formatDateLong, hojeNaClinica, isDateOnly, somarDias } from "@/lib/utils/date";

export const metadata: Metadata = { title: "Agenda" };

interface PageProps {
  searchParams: Promise<{ data?: string; profissional?: string }>;
}

export default async function AgendaPage({ searchParams }: PageProps) {
  const { data: dataBruta, profissional } = await searchParams;
  const { clinica } = await requireActiveSubscription();

  const hoje = hojeNaClinica(clinica.timezone);
  // Uma data invalida na URL cai em hoje, em vez de quebrar a pagina.
  const data = dataBruta && isDateOnly(dataBruta) ? dataBruta : hoje;

  const [agendamentos, profissionais, procedimentos, clientes] = await Promise.all([
    agendamentosDoDia(data, { profissionalId: profissional }),
    listarProfissionaisAtivas(),
    listarProcedimentosAtivos(),
    clientesParaSelecao(),
  ]);

  const href = (novaData: string) => {
    const query = new URLSearchParams({ data: novaData });
    if (profissional) query.set("profissional", profissional);
    return `/agenda?${query.toString()}`;
  };

  // Bloqueio nao e compromisso: contar o almoco como "1 compromisso" faria a
  // agenda parecer cheia num dia vazio.
  const ativos = agendamentos.filter(
    (a) => a.status !== "cancelado" && a.tipo !== "bloqueio",
  );

  return (
    <>
      <PageHeader
        titulo="Agenda"
        descricao={
          ativos.length === 0
            ? "Nenhum compromisso marcado."
            : `${ativos.length} ${ativos.length === 1 ? "compromisso" : "compromissos"} neste dia.`
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" asChild aria-label="Dia anterior">
          <Link href={href(somarDias(data, -1))}>
            <ChevronLeftIcon className="size-4" />
          </Link>
        </Button>
        <Button variant="outline" size="icon-sm" asChild aria-label="Próximo dia">
          <Link href={href(somarDias(data, 1))}>
            <ChevronRightIcon className="size-4" />
          </Link>
        </Button>

        <p className="texto-display text-lg font-medium first-letter:uppercase">
          {formatDateLong(data)}
        </p>

        {data !== hoje ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={href(hoje)}>Voltar para hoje</Link>
          </Button>
        ) : null}
      </div>

      <AgendaView
        agendamentos={agendamentos}
        negocioNome={clinica.nome_fantasia ?? clinica.nome}
        profissionais={profissionais}
        procedimentos={procedimentos}
        clientes={clientes}
        data={data}
      />
    </>
  );
}
