import type { Metadata } from "next";

import { EscalaView } from "@/components/escala/escala-view";
import { PageHeader } from "@/components/shared/page-header";
import { requireActiveSubscription } from "@/lib/auth/session";
import { listarEscalasDoPeriodo } from "@/lib/data/escalas";
import { listarProfissionaisAtivas } from "@/lib/data/profissionais";
import {
  diasDaSemana,
  hojeNaClinica,
  inicioDaSemana,
  isDateOnly,
  somarDias,
} from "@/lib/utils/date";

export const metadata: Metadata = { title: "Escala" };

interface PageProps {
  searchParams: Promise<{ semana?: string }>;
}

export default async function EscalaPage({ searchParams }: PageProps) {
  const { semana } = await searchParams;
  const { clinica } = await requireActiveSubscription();

  const hoje = hojeNaClinica(clinica.timezone);
  // Parametro invalido cai silenciosamente na semana corrente.
  const referencia = semana && isDateOnly(semana) ? semana : hoje;
  const segunda = inicioDaSemana(referencia);
  const domingo = somarDias(segunda, 6);

  const [turnos, profissionais] = await Promise.all([
    listarEscalasDoPeriodo(segunda, domingo),
    listarProfissionaisAtivas(),
  ]);

  return (
    <>
      <PageHeader
        titulo="Escala"
        descricao="Turnos da equipe organizados por semana. Cada profissional pode ter mais de um turno por dia."
      />
      <EscalaView
        semana={segunda}
        dias={diasDaSemana(segunda)}
        turnos={turnos}
        profissionais={profissionais}
        hoje={hoje}
      />
    </>
  );
}
