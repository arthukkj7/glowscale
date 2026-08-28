"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { excluirEscala } from "@/lib/actions/escalas";
import type { TurnoDaEscala } from "@/lib/data/escalas";
import { formatTurno, rotuloSemana, somarDias, type DiaDaSemana } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { ProfissionalRow } from "@/types/database";
import { EscalaDialog, type TurnoEmEdicao } from "./escala-dialog";

interface EscalaViewProps {
  semana: string;
  dias: DiaDaSemana[];
  turnos: TurnoDaEscala[];
  profissionais: ProfissionalRow[];
  hoje: string;
}

export function EscalaView({ semana, dias, turnos, profissionais, hoje }: EscalaViewProps) {
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [turnoEmEdicao, setTurnoEmEdicao] = useState<TurnoEmEdicao | null>(null);
  const [paraExcluir, setParaExcluir] = useState<TurnoDaEscala | null>(null);

  const semanaAnterior = somarDias(semana, -7);
  const proximaSemana = somarDias(semana, 7);

  // Indice: profissional -> data -> turnos do dia.
  const porProfissional = new Map<string, Map<string, TurnoDaEscala[]>>();
  for (const turno of turnos) {
    const porData = porProfissional.get(turno.profissional_id) ?? new Map();
    porData.set(turno.data, [...(porData.get(turno.data) ?? []), turno]);
    porProfissional.set(turno.profissional_id, porData);
  }

  function abrirNovoTurno(dataSugerida?: string, profissionalSugerida?: string) {
    setTurnoEmEdicao({ dataSugerida: dataSugerida ?? hoje, profissionalSugerida });
    setDialogoAberto(true);
  }

  function abrirEdicao(turno: TurnoDaEscala) {
    setTurnoEmEdicao({ escala: turno });
    setDialogoAberto(true);
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const resultado = await excluirEscala(paraExcluir.id);
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(resultado.mensagem ?? "Turno removido.");
    setParaExcluir(null);
  }

  if (profissionais.length === 0) {
    return (
      <EmptyState
        icone={CalendarDaysIcon}
        titulo="Cadastre uma profissional para montar a escala"
        descricao="A escala e organizada por profissional. Assim que houver ao menos uma cadastrada, a grade semanal aparece aqui."
        acao={
          <Button asChild>
            <Link href="/profissionais">Ir para profissionais</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" asChild aria-label="Semana anterior">
            <Link href={`/escala?semana=${semanaAnterior}`}>
              <ChevronLeftIcon className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/escala">Hoje</Link>
          </Button>
          <Button variant="outline" size="icon-sm" asChild aria-label="Próxima semana">
            <Link href={`/escala?semana=${proximaSemana}`}>
              <ChevronRightIcon className="size-4" />
            </Link>
          </Button>
          <p className="ml-2 text-sm font-medium capitalize">{rotuloSemana(semana)}</p>
        </div>

        <Button onClick={() => abrirNovoTurno()}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Adicionar turno
        </Button>
      </div>

      {/* Desktop: grade profissional x dia */}
      <Card className="hidden overflow-x-auto scrollbar-suave lg:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Escala semanal por profissional, de {rotuloSemana(semana)}
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Profissional
              </th>
              {dias.map((dia) => (
                <th
                  key={dia.data}
                  scope="col"
                  className={cn(
                    "px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide",
                    dia.data === hoje ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span className="block">{dia.rotuloCurto}</span>
                  <span className="block text-[0.7rem] font-normal normal-case">
                    {dia.data.slice(8, 10)}/{dia.data.slice(5, 7)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profissionais.map((profissional) => {
              const porData = porProfissional.get(profissional.id);
              return (
                <tr key={profissional.id} className="border-b border-border last:border-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 max-w-48 truncate bg-card px-4 py-3 text-left font-medium"
                  >
                    {profissional.nome}
                  </th>
                  {dias.map((dia) => {
                    const doDia = porData?.get(dia.data) ?? [];
                    return (
                      <td
                        key={dia.data}
                        className={cn(
                          "px-2 py-2 text-center align-top",
                          dia.data === hoje && "bg-accent/40",
                        )}
                      >
                        {doDia.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => abrirNovoTurno(dia.data, profissional.id)}
                            className="w-full rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            aria-label={`Adicionar turno para ${profissional.nome} em ${dia.data}`}
                          >
                            -
                          </button>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {doDia.map((turno) => (
                              <button
                                key={turno.id}
                                type="button"
                                onClick={() => abrirEdicao(turno)}
                                title={turno.observacoes ?? undefined}
                                className="rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/18"
                              >
                                {formatTurno(turno.hora_inicio, turno.hora_fim)}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Mobile: um cartao por dia */}
      <div className="space-y-3 lg:hidden">
        {dias.map((dia) => {
          const doDia = turnos.filter((turno) => turno.data === dia.data);
          return (
            <Card
              key={dia.data}
              className={cn("p-4", dia.data === hoje && "border-primary/40 bg-accent/30")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{dia.rotuloLongo}</p>
                  <p className="text-xs text-muted-foreground">
                    {dia.data.slice(8, 10)}/{dia.data.slice(5, 7)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => abrirNovoTurno(dia.data)}
                  aria-label={`Adicionar turno em ${dia.rotuloLongo}`}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </div>

              {doDia.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum turno neste dia.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {doDia.map((turno) => (
                    <li
                      key={turno.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => abrirEdicao(turno)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium">{turno.profissional_nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTurno(turno.hora_inicio, turno.hora_fim)}
                          {turno.observacoes ? ` - ${turno.observacoes}` : ""}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setParaExcluir(turno)}
                        aria-label={`Remover turno de ${turno.profissional_nome}`}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <p className="hidden text-xs text-muted-foreground lg:block">
        Clique em um turno para editar ou remover. Clique em um dia vazio para adicionar.
      </p>

      <EscalaDialog
        aberto={dialogoAberto}
        onAbertoChange={setDialogoAberto}
        profissionais={profissionais}
        turno={turnoEmEdicao}
        onSolicitarExclusao={(escala) => {
          const turnoCompleto = turnos.find((item) => item.id === escala.id);
          if (turnoCompleto) setParaExcluir(turnoCompleto);
        }}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        onAbertoChange={(aberto) => !aberto && setParaExcluir(null)}
        titulo="Remover turno"
        descricao={
          paraExcluir
            ? `Remover o turno de ${paraExcluir.profissional_nome} em ${paraExcluir.data.slice(8, 10)}/${paraExcluir.data.slice(5, 7)}?`
            : ""
        }
        textoConfirmar="Remover"
        destrutivo
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
