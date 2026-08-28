"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { CurrencyInput } from "@/components/shared/currency-input";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { atualizarProcedimento, criarProcedimento } from "@/lib/actions/procedimentos";
import {
  procedimentoSchema,
  type ProcedimentoFormValues,
  type ProcedimentoInput,
} from "@/lib/validations";
import type { ProcedimentoRow } from "@/types/database";

interface ProcedimentoDialogProps {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  procedimento?: ProcedimentoRow | null;
}

function valoresIniciais(procedimento?: ProcedimentoRow | null): ProcedimentoFormValues {
  if (!procedimento) {
    return { nome: "", descricao: "", valor: "", duracao_minutos: 60, ativo: true };
  }
  return {
    nome: procedimento.nome,
    descricao: procedimento.descricao ?? "",
    valor: procedimento.valor,
    duracao_minutos: procedimento.duracao_minutos,
    ativo: procedimento.ativo,
  };
}

function FormularioProcedimento({
  procedimento,
  onConcluir,
}: {
  procedimento?: ProcedimentoRow | null;
  onConcluir: () => void;
}) {
  const editando = Boolean(procedimento);
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ProcedimentoFormValues, unknown, ProcedimentoInput>({
    resolver: zodResolver(procedimentoSchema),
    defaultValues: valoresIniciais(procedimento),
  });

  const ativo = useWatch({ control, name: "ativo" });

  function aoEnviar(valores: ProcedimentoInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = procedimento
        ? await atualizarProcedimento({ ...valores, id: procedimento.id })
        : await criarProcedimento(valores);

      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Dados salvos.");
      onConcluir();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField id="proc-nome" rotulo="Nome" erro={errors.nome?.message} obrigatorio>
        <Input
          {...camposAria("proc-nome", errors.nome?.message)}
          {...register("nome")}
          placeholder="Limpeza de pele profunda"
          disabled={pendente}
        />
      </FormField>

      <FormField id="proc-descricao" rotulo="Descrição" erro={errors.descricao?.message}>
        <Textarea
          {...camposAria("proc-descricao", errors.descricao?.message)}
          {...register("descricao")}
          placeholder="O que esta incluso na sessão."
          rows={3}
          disabled={pendente}
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="proc-valor" rotulo="Valor" erro={errors.valor?.message} obrigatorio>
          <Controller
            control={control}
            name="valor"
            render={({ field }) => (
              <CurrencyInput
                {...camposAria("proc-valor", errors.valor?.message)}
                value={typeof field.value === "number" ? field.value : null}
                onValueChange={(valor) => field.onChange(valor ?? "")}
                onBlur={field.onBlur}
                disabled={pendente}
              />
            )}
          />
        </FormField>

        <FormField
          id="proc-duracao"
          rotulo="Duração (minutos)"
          erro={errors.duracao_minutos?.message}
          obrigatorio
        >
          <Input
            {...camposAria("proc-duracao", errors.duracao_minutos?.message)}
            {...register("duracao_minutos")}
            type="number"
            min={1}
            max={1440}
            step={5}
            disabled={pendente}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Procedimento ativo</p>
          <p className="text-xs text-muted-foreground">
            Procedimentos inativos não aparecem nos lançamentos.
          </p>
        </div>
        <Switch
          checked={Boolean(ativo)}
          onCheckedChange={(valor) => setValue("ativo", valor, { shouldDirty: true })}
          disabled={pendente}
          aria-label="Procedimento ativo"
        />
      </div>

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
          {editando ? "Salvar alterações" : "Cadastrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ProcedimentoDialog({
  aberto,
  onAbertoChange,
  procedimento,
}: ProcedimentoDialogProps) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {procedimento ? "Editar procedimento" : "Novo procedimento"}
          </DialogTitle>
          <DialogDescription>
            O valor cadastrado e sugerido automaticamente no lançamento de atendimentos.
          </DialogDescription>
        </DialogHeader>

        <FormularioProcedimento
          key={procedimento?.id ?? "novo"}
          procedimento={procedimento}
          onConcluir={() => onAbertoChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
