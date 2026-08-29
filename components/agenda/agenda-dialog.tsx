"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { DatePicker } from "@/components/shared/date-picker";
import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { atualizarAgendamento, criarAgendamento } from "@/lib/actions/agenda";
import { formatCurrency } from "@/lib/calculations/money";
import {
  agendamentoSchema,
  type AgendamentoFormValues,
  type AgendamentoInput,
} from "@/lib/validations";
import type {
  AgendamentoRow,
  ClienteRow,
  ProcedimentoRow,
  ProfissionalRow,
} from "@/types/database";

/** O Select do Radix recusa string vazia como valor de item. */
const SEM_CLIENTE = "__sem_cliente__";

interface AgendaDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  profissionais: ProfissionalRow[];
  procedimentos: ProcedimentoRow[];
  clientes: Pick<ClienteRow, "id" | "nome">[];
  agendamento?: AgendamentoRow | null;
  dataPadrao: string;
}

/** "14:00" + 60min -> "15:00". Fica no dia, sem virar para o seguinte. */
function somarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  if (h === undefined || m === undefined) return hora;
  const total = Math.min(h * 60 + m + minutos, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function valoresIniciais(
  agendamento: AgendamentoRow | null | undefined,
  dataPadrao: string,
): AgendamentoFormValues {
  if (!agendamento) {
    return {
      cliente_id: "",
      profissional_id: "",
      procedimento_id: "",
      data: dataPadrao,
      hora_inicio: "09:00",
      hora_fim: "10:00",
      status: "agendado",
      observacoes: "",
    };
  }
  return {
    cliente_id: agendamento.cliente_id ?? "",
    profissional_id: agendamento.profissional_id,
    procedimento_id: agendamento.procedimento_id ?? "",
    data: agendamento.data,
    // O banco devolve "14:00:00"; o input type=time quer "14:00".
    hora_inicio: agendamento.hora_inicio.slice(0, 5),
    hora_fim: agendamento.hora_fim.slice(0, 5),
    status: agendamento.status,
    observacoes: agendamento.observacoes ?? "",
  };
}

function Formulario({
  agendamento,
  profissionais,
  procedimentos,
  clientes,
  dataPadrao,
  onConcluir,
}: {
  agendamento?: AgendamentoRow | null;
  profissionais: ProfissionalRow[];
  procedimentos: ProcedimentoRow[];
  clientes: Pick<ClienteRow, "id" | "nome">[];
  dataPadrao: string;
  onConcluir: () => void;
}) {
  const editando = Boolean(agendamento);
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AgendamentoFormValues, unknown, AgendamentoInput>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: valoresIniciais(agendamento, dataPadrao),
  });

  const horaInicio = useWatch({ control, name: "hora_inicio" });

  /**
   * Escolher o servico preenche o horario final a partir da duracao cadastrada.
   * Poupa a conta de cabeca no caso comum e continua editavel para o incomum.
   */
  function aoEscolherServico(id: string) {
    setValue("procedimento_id", id, { shouldValidate: true });
    const servico = procedimentos.find((p) => p.id === id);
    if (servico && horaInicio) {
      setValue("hora_fim", somarMinutos(horaInicio, servico.duracao_minutos), {
        shouldValidate: true,
      });
    }
  }

  function aoEnviar(valores: AgendamentoInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = agendamento
        ? await atualizarAgendamento({ ...valores, id: agendamento.id })
        : await criarAgendamento(valores);

      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Agendamento salvo.");
      onConcluir();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField
        id="ag-cliente"
        rotulo="Cliente"
        erro={errors.cliente_id?.message}
        descricao="Opcional — deixe em branco para um encaixe."
      >
        <Controller
          control={control}
          name="cliente_id"
          render={({ field }) => (
            <Select
              value={field.value ? String(field.value) : SEM_CLIENTE}
              onValueChange={(v) => field.onChange(v === SEM_CLIENTE ? "" : v)}
              disabled={pendente}
            >
              <SelectTrigger {...camposAria("ag-cliente", errors.cliente_id?.message)}>
                <SelectValue placeholder="Sem cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CLIENTE}>Sem cliente (encaixe)</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="ag-profissional"
          rotulo="Profissional"
          erro={errors.profissional_id?.message}
          obrigatorio
        >
          <Controller
            control={control}
            name="profissional_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={pendente}>
                <SelectTrigger
                  {...camposAria("ag-profissional", errors.profissional_id?.message)}
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          id="ag-servico"
          rotulo="Serviço"
          erro={errors.procedimento_id?.message}
          obrigatorio
        >
          <Controller
            control={control}
            name="procedimento_id"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={aoEscolherServico}
                disabled={pendente}
              >
                <SelectTrigger {...camposAria("ag-servico", errors.procedimento_id?.message)}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {procedimentos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} — {formatCurrency(s.valor)} ({s.duracao_minutos}min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField id="ag-data" rotulo="Data" erro={errors.data?.message} obrigatorio>
          <DatePicker
            {...camposAria("ag-data", errors.data?.message)}
            {...register("data")}
            disabled={pendente}
          />
        </FormField>

        <FormField id="ag-inicio" rotulo="Início" erro={errors.hora_inicio?.message} obrigatorio>
          <Input
            {...camposAria("ag-inicio", errors.hora_inicio?.message)}
            {...register("hora_inicio")}
            type="time"
            disabled={pendente}
          />
        </FormField>

        <FormField id="ag-fim" rotulo="Fim" erro={errors.hora_fim?.message} obrigatorio>
          <Input
            {...camposAria("ag-fim", errors.hora_fim?.message)}
            {...register("hora_fim")}
            type="time"
            disabled={pendente}
          />
        </FormField>
      </div>

      <FormField id="ag-obs" rotulo="Observações" erro={errors.observacoes?.message}>
        <Textarea
          {...camposAria("ag-obs", errors.observacoes?.message)}
          {...register("observacoes")}
          rows={2}
          placeholder="Cor escolhida, preferências, o que combinaram."
          disabled={pendente}
        />
      </FormField>

      {erroGeral ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroGeral}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onConcluir} disabled={pendente}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
          {editando ? "Salvar alterações" : "Agendar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AgendaDialog({
  aberto,
  onAbertoChange,
  profissionais,
  procedimentos,
  clientes,
  agendamento,
  dataPadrao,
}: AgendaDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agendamento ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>
            O horário final é sugerido pela duração do serviço, mas pode ser ajustado. Dois
            compromissos não podem se cruzar para a mesma profissional.
          </DialogDescription>
        </DialogHeader>

        <Formulario
          key={agendamento?.id ?? "novo"}
          agendamento={agendamento}
          profissionais={profissionais}
          procedimentos={procedimentos}
          clientes={clientes}
          dataPadrao={dataPadrao}
          onConcluir={() => onAbertoChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
