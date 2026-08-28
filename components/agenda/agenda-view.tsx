"use client";

import {
  CalendarPlusIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ReceiptTextIcon,
  Trash2Icon,
  UserRoundXIcon,
  XIcon,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  alterarStatusDoAgendamento,
  concluirAgendamento,
  excluirAgendamento,
} from "@/lib/actions/agenda";
import { formatCurrency } from "@/lib/calculations/money";
import { AGENDAMENTO_STATUS_LABEL } from "@/lib/constants";
import type {
  AgendamentoDaAgenda,
  AgendamentoRow,
  AgendamentoStatus,
  ClienteRow,
  ProcedimentoRow,
  ProfissionalRow,
} from "@/types/database";
import { AgendaDialog } from "./agenda-dialog";

interface AgendaViewProps {
  agendamentos: AgendamentoDaAgenda[];
  profissionais: ProfissionalRow[];
  procedimentos: ProcedimentoRow[];
  clientes: Pick<ClienteRow, "id" | "nome">[];
  data: string;
}

const CORES: Record<AgendamentoStatus, string> = {
  agendado: "border-l-muted-foreground/40",
  confirmado: "border-l-success",
  concluido: "border-l-primary",
  cancelado: "border-l-destructive/50",
  faltou: "border-l-warning",
};

/** Um agendamento cancelado ou concluido nao aceita mais mudanca de rumo. */
const encerrado = (s: AgendamentoStatus) =>
  s === "cancelado" || s === "concluido" || s === "faltou";

export function AgendaView({
  agendamentos,
  profissionais,
  procedimentos,
  clientes,
  data,
}: AgendaViewProps) {
  const [pendente, startTransition] = useTransition();
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<AgendamentoRow | null>(null);
  const [paraExcluir, setParaExcluir] = useState<AgendamentoDaAgenda | null>(null);
  const [paraConcluir, setParaConcluir] = useState<AgendamentoDaAgenda | null>(null);

  function abrirCriacao() {
    setEmEdicao(null);
    setDialogoAberto(true);
  }

  function mudarStatus(a: AgendamentoDaAgenda, status: AgendamentoStatus) {
    startTransition(async () => {
      const resultado = await alterarStatusDoAgendamento({ id: a.id, status });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Situação atualizada.");
    });
  }

  async function confirmarConclusao() {
    if (!paraConcluir) return;
    const resultado = await concluirAgendamento({ id: paraConcluir.id });
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(resultado.mensagem ?? "Atendimento lançado.");
    setParaConcluir(null);
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const resultado = await excluirAgendamento({ id: paraExcluir.id });
    if (!resultado.ok) {
      toast.error(resultado.erro);
      return;
    }
    toast.success(resultado.mensagem ?? "Agendamento removido.");
    setParaExcluir(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={abrirCriacao}>
          <CalendarPlusIcon className="size-4" aria-hidden="true" />
          Novo agendamento
        </Button>
      </div>

      {agendamentos.length === 0 ? (
        <EmptyState
          icone={CalendarPlusIcon}
          titulo="Nenhum compromisso neste dia"
          descricao="Marque o primeiro horário. O sistema impede que dois compromissos se cruzem para a mesma profissional."
          acao={
            <Button onClick={abrirCriacao}>
              <CalendarPlusIcon className="size-4" aria-hidden="true" />
              Novo agendamento
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {agendamentos.map((a) => (
            <li key={a.id}>
              <Card
                className={`flex items-center gap-4 border-l-4 p-4 ${CORES[a.status]} ${
                  a.status === "cancelado" ? "opacity-60" : ""
                }`}
              >
                <div className="w-14 shrink-0">
                  <p className="texto-display text-lg font-semibold tabular-nums">
                    {a.hora_inicio.slice(0, 5)}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {a.hora_fim.slice(0, 5)}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {a.cliente_nome ?? <span className="text-muted-foreground">Encaixe</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{a.servico_nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.profissional_nome}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-sm font-medium tabular-nums">
                    {formatCurrency(a.servico_valor)}
                  </p>
                </div>

                <Badge
                  variant={a.status === "confirmado" ? "default" : "outline"}
                  className="hidden shrink-0 sm:inline-flex"
                >
                  {AGENDAMENTO_STATUS_LABEL[a.status]}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ações para o horário das ${a.hora_inicio.slice(0, 5)}`}
                      disabled={pendente}
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {a.status === "agendado" ? (
                      <DropdownMenuItem onSelect={() => mudarStatus(a, "confirmado")}>
                        <CheckIcon aria-hidden="true" />
                        Confirmar presença
                      </DropdownMenuItem>
                    ) : null}

                    {!encerrado(a.status) ? (
                      <DropdownMenuItem onSelect={() => setParaConcluir(a)}>
                        <ReceiptTextIcon aria-hidden="true" />
                        Lançar atendimento
                      </DropdownMenuItem>
                    ) : null}

                    <DropdownMenuItem
                      onSelect={() => {
                        setEmEdicao(a);
                        setDialogoAberto(true);
                      }}
                    >
                      <PencilIcon aria-hidden="true" />
                      Editar / remarcar
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {!encerrado(a.status) ? (
                      <>
                        <DropdownMenuItem onSelect={() => mudarStatus(a, "faltou")}>
                          <UserRoundXIcon aria-hidden="true" />
                          Não compareceu
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => mudarStatus(a, "cancelado")}>
                          <XIcon aria-hidden="true" />
                          Cancelar
                        </DropdownMenuItem>
                      </>
                    ) : a.status !== "concluido" ? (
                      <DropdownMenuItem onSelect={() => mudarStatus(a, "agendado")}>
                        <CheckIcon aria-hidden="true" />
                        Reabrir
                      </DropdownMenuItem>
                    ) : null}

                    <DropdownMenuItem variant="destructive" onSelect={() => setParaExcluir(a)}>
                      <Trash2Icon aria-hidden="true" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <AgendaDialog
        aberto={dialogoAberto}
        onAbertoChange={setDialogoAberto}
        profissionais={profissionais}
        procedimentos={procedimentos}
        clientes={clientes}
        agendamento={emEdicao}
        dataPadrao={data}
      />

      <ConfirmDialog
        aberto={paraConcluir !== null}
        onAbertoChange={(aberto) => !aberto && setParaConcluir(null)}
        titulo="Lançar atendimento"
        descricao={
          `Isto registra o atendimento de ${paraConcluir?.servico_nome ?? "este serviço"} ` +
          `por ${formatCurrency(paraConcluir?.servico_valor ?? 0)} e calcula a comissão de ` +
          `${paraConcluir?.profissional_nome ?? "a profissional"}. ` +
          "O valor pode ser ajustado depois em Atendimentos."
        }
        textoConfirmar="Lançar"
        onConfirmar={confirmarConclusao}
      />

      <ConfirmDialog
        aberto={paraExcluir !== null}
        onAbertoChange={(aberto) => !aberto && setParaExcluir(null)}
        titulo="Excluir agendamento"
        descricao="O horário volta a ficar livre. Para manter o registro de que a cliente faltou, prefira marcar como não compareceu."
        textoConfirmar="Excluir"
        destrutivo
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
