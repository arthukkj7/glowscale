"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Switch } from "@/components/ui/switch";
import { bloquearHorario } from "@/lib/actions/agenda";
import { dataISO, horaHHMM, idUuid, textoOpcional } from "@/lib/validations";
import type { ProfissionalRow } from "@/types/database";

const esquema = z
  .object({
    profissional_id: idUuid,
    data_inicial: dataISO,
    data_final: dataISO,
    hora_inicio: horaHHMM,
    hora_fim: horaHHMM,
    motivo: textoOpcional(200),
    diaInteiro: z.boolean().default(false),
  })
  .refine((d) => d.data_final >= d.data_inicial, {
    message: "A data final deve ser igual ou posterior à inicial.",
    path: ["data_final"],
  })
  .refine((d) => d.diaInteiro || d.hora_fim > d.hora_inicio, {
    message: "O horário final deve ser maior que o inicial.",
    path: ["hora_fim"],
  });

type Valores = z.input<typeof esquema>;
type Entrada = z.infer<typeof esquema>;

interface BloqueioDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  profissionais: ProfissionalRow[];
  dataPadrao: string;
}

function Formulario({
  profissionais,
  dataPadrao,
  onConcluir,
}: {
  profissionais: ProfissionalRow[];
  dataPadrao: string;
  onConcluir: () => void;
}) {
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Valores, unknown, Entrada>({
    resolver: zodResolver(esquema),
    defaultValues: {
      profissional_id: profissionais[0]?.id ?? "",
      data_inicial: dataPadrao,
      data_final: dataPadrao,
      hora_inicio: "12:00",
      hora_fim: "13:00",
      motivo: "",
      diaInteiro: false,
    },
  });

  const diaInteiro = useWatch({ control, name: "diaInteiro" });

  function aoEnviar(valores: Entrada) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = await bloquearHorario({
        profissional_id: valores.profissional_id,
        data_inicial: valores.data_inicial,
        data_final: valores.data_final,
        // Dia inteiro cobre a jornada toda: nao existe horario fora dele.
        hora_inicio: valores.diaInteiro ? "00:00" : valores.hora_inicio,
        hora_fim: valores.diaInteiro ? "23:59" : valores.hora_fim,
        motivo: valores.motivo,
      });

      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Horário bloqueado.");
      onConcluir();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField
        id="bl-profissional"
        rotulo="Profissional"
        erro={errors.profissional_id?.message}
        obrigatorio
      >
        <Controller
          control={control}
          name="profissional_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={pendente}>
              <SelectTrigger {...camposAria("bl-profissional", errors.profissional_id?.message)}>
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

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="bl-de"
          rotulo="De"
          erro={errors.data_inicial?.message}
          obrigatorio
        >
          <DatePicker
            {...camposAria("bl-de", errors.data_inicial?.message)}
            {...register("data_inicial")}
            disabled={pendente}
          />
        </FormField>
        <FormField
          id="bl-ate"
          rotulo="Até"
          erro={errors.data_final?.message}
          descricao="O mesmo dia, para um bloqueio único."
          obrigatorio
        >
          <DatePicker
            {...camposAria("bl-ate", errors.data_final?.message, "O mesmo dia, para um bloqueio único.")}
            {...register("data_final")}
            disabled={pendente}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Dia inteiro</p>
          <p className="text-xs text-muted-foreground">
            Para folga, feriado ou férias.
          </p>
        </div>
        <Switch
          checked={Boolean(diaInteiro)}
          onCheckedChange={(v) => setValue("diaInteiro", v, { shouldDirty: true })}
          disabled={pendente}
          aria-label="Bloquear o dia inteiro"
        />
      </div>

      {!diaInteiro ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="bl-inicio" rotulo="Início" erro={errors.hora_inicio?.message} obrigatorio>
            <Input
              {...camposAria("bl-inicio", errors.hora_inicio?.message)}
              {...register("hora_inicio")}
              type="time"
              disabled={pendente}
            />
          </FormField>
          <FormField id="bl-fim" rotulo="Fim" erro={errors.hora_fim?.message} obrigatorio>
            <Input
              {...camposAria("bl-fim", errors.hora_fim?.message)}
              {...register("hora_fim")}
              type="time"
              disabled={pendente}
            />
          </FormField>
        </div>
      ) : null}

      <FormField
        id="bl-motivo"
        rotulo="Motivo"
        erro={errors.motivo?.message}
        descricao="Só você e sua equipe veem."
      >
        <Input
          {...camposAria("bl-motivo", errors.motivo?.message, "Só você e sua equipe veem.")}
          {...register("motivo")}
          placeholder="Almoço, médico, férias..."
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
          Bloquear
        </Button>
      </DialogFooter>
    </form>
  );
}

export function BloqueioDialog({
  aberto,
  onAbertoChange,
  profissionais,
  dataPadrao,
}: BloqueioDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
          <DialogDescription>
            Tempo em que a profissional não atende. Ninguém consegue marcar em cima — nem
            você. Dias que já tenham cliente marcado ficam de fora, e o sistema avisa quais.
          </DialogDescription>
        </DialogHeader>

        <Formulario
          key={dataPadrao}
          profissionais={profissionais}
          dataPadrao={dataPadrao}
          onConcluir={() => onAbertoChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
