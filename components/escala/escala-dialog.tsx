"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { DatePicker, TimePicker } from "@/components/shared/date-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { atualizarEscala, criarEscala } from "@/lib/actions/escalas";
import { escalaSchema, type EscalaFormValues, type EscalaInput } from "@/lib/validations";
import type { EscalaRow, ProfissionalRow } from "@/types/database";

export interface TurnoEmEdicao {
  escala?: EscalaRow;
  dataSugerida?: string;
  profissionalSugerida?: string;
}

interface EscalaDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  profissionais: ProfissionalRow[];
  turno: TurnoEmEdicao | null;
  /** Fecha o formulario e pede confirmacao de remocao ao componente pai. */
  onSolicitarExclusao?: (escala: EscalaRow) => void;
}

function apenasHoraMinuto(valor: string): string {
  return valor.slice(0, 5);
}

function valoresIniciais(
  turno: TurnoEmEdicao,
  profissionais: ProfissionalRow[],
): EscalaFormValues {
  return {
    profissional_id:
      turno.escala?.profissional_id ?? turno.profissionalSugerida ?? profissionais[0]?.id ?? "",
    data: turno.escala?.data ?? turno.dataSugerida ?? "",
    hora_inicio: apenasHoraMinuto(turno.escala?.hora_inicio ?? "08:00"),
    hora_fim: apenasHoraMinuto(turno.escala?.hora_fim ?? "18:00"),
    observacoes: turno.escala?.observacoes ?? "",
  };
}

function FormularioEscala({
  turno,
  profissionais,
  onConcluir,
  onSolicitarExclusao,
}: {
  turno: TurnoEmEdicao;
  profissionais: ProfissionalRow[];
  onConcluir: () => void;
  onSolicitarExclusao?: (escala: EscalaRow) => void;
}) {
  const escalaEmEdicao = turno.escala;
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EscalaFormValues, unknown, EscalaInput>({
    resolver: zodResolver(escalaSchema),
    defaultValues: valoresIniciais(turno, profissionais),
  });

  function aoEnviar(valores: EscalaInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = escalaEmEdicao
        ? await atualizarEscala({ ...valores, id: escalaEmEdicao.id })
        : await criarEscala(valores);

      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Turno salvo.");
      onConcluir();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField
        id="escala-profissional"
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
                {...camposAria("escala-profissional", errors.profissional_id?.message)}
              >
                <SelectValue placeholder="Selecione a profissional" />
              </SelectTrigger>
              <SelectContent>
                {profissionais.map((profissional) => (
                  <SelectItem key={profissional.id} value={profissional.id}>
                    {profissional.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField id="escala-data" rotulo="Data" erro={errors.data?.message} obrigatorio>
        <DatePicker
          {...camposAria("escala-data", errors.data?.message)}
          {...register("data")}
          disabled={pendente}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="escala-inicio"
          rotulo="Início"
          erro={errors.hora_inicio?.message}
          obrigatorio
        >
          <TimePicker
            {...camposAria("escala-inicio", errors.hora_inicio?.message)}
            {...register("hora_inicio")}
            disabled={pendente}
          />
        </FormField>

        <FormField id="escala-fim" rotulo="Fim" erro={errors.hora_fim?.message} obrigatorio>
          <TimePicker
            {...camposAria("escala-fim", errors.hora_fim?.message)}
            {...register("hora_fim")}
            disabled={pendente}
          />
        </FormField>
      </div>

      <FormField id="escala-obs" rotulo="Observações" erro={errors.observacoes?.message}>
        <Textarea
          {...camposAria("escala-obs", errors.observacoes?.message)}
          {...register("observacoes")}
          rows={2}
          placeholder="Plantao, horário reduzido, sala especifica..."
          disabled={pendente}
        />
      </FormField>

      {erroGeral ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroGeral}
        </p>
      ) : null}

      <DialogFooter className="sm:justify-between">
        {escalaEmEdicao && onSolicitarExclusao ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => {
              onConcluir();
              onSolicitarExclusao(escalaEmEdicao);
            }}
            disabled={pendente}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            Remover turno
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onConcluir} disabled={pendente}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente}>
            {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
            {escalaEmEdicao ? "Salvar turno" : "Adicionar turno"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function EscalaDialog({
  aberto,
  onAbertoChange,
  profissionais,
  turno,
  onSolicitarExclusao,
}: EscalaDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{turno?.escala ? "Editar turno" : "Adicionar turno"}</DialogTitle>
          <DialogDescription>
            Cada profissional pode ter mais de um turno no mesmo dia.
          </DialogDescription>
        </DialogHeader>

        {turno ? (
          <FormularioEscala
            key={turno.escala?.id ?? `novo-${turno.dataSugerida ?? ""}-${turno.profissionalSugerida ?? ""}`}
            turno={turno}
            profissionais={profissionais}
            onConcluir={() => onAbertoChange(false)}
            onSolicitarExclusao={onSolicitarExclusao}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
