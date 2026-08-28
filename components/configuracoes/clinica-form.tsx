"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { atualizarClinica } from "@/lib/actions/clinica";
import { UF_BRASIL } from "@/lib/constants";
import { clinicaSchema, type ClinicaFormValues, type ClinicaInput } from "@/lib/validations";
import type { ClinicaRow } from "@/types/database";

interface ClinicaFormProps {
  clinica: ClinicaRow;
  somenteLeitura: boolean;
}

export function ClinicaForm({ clinica, somenteLeitura }: ClinicaFormProps) {
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<ClinicaFormValues, unknown, ClinicaInput>({
    resolver: zodResolver(clinicaSchema),
    defaultValues: {
      nome: clinica.nome,
      nome_fantasia: clinica.nome_fantasia ?? "",
      email: clinica.email ?? "",
      telefone: clinica.telefone ?? "",
      cidade: clinica.cidade ?? "",
      estado: clinica.estado ?? "",
    },
  });

  function aoEnviar(valores: ClinicaInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = await atualizarClinica(valores);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Dados atualizados.");
    });
  }

  const desabilitado = pendente || somenteLeitura;

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="clinica-nome" rotulo="Razão social" erro={errors.nome?.message} obrigatorio>
          <Input
            {...camposAria("clinica-nome", errors.nome?.message)}
            {...register("nome")}
            disabled={desabilitado}
          />
        </FormField>

        <FormField
          id="clinica-fantasia"
          rotulo="Nome fantasia"
          erro={errors.nome_fantasia?.message}
          descricao="Nome exibido no topo do painel."
        >
          <Input
            {...camposAria("clinica-fantasia", errors.nome_fantasia?.message)}
            {...register("nome_fantasia")}
            disabled={desabilitado}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="clinica-email" rotulo="E-mail" erro={errors.email?.message}>
          <Input
            {...camposAria("clinica-email", errors.email?.message)}
            {...register("email")}
            type="email"
            disabled={desabilitado}
          />
        </FormField>

        <FormField id="clinica-telefone" rotulo="Telefone" erro={errors.telefone?.message}>
          <Input
            {...camposAria("clinica-telefone", errors.telefone?.message)}
            {...register("telefone")}
            type="tel"
            disabled={desabilitado}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
        <FormField id="clinica-cidade" rotulo="Cidade" erro={errors.cidade?.message}>
          <Input
            {...camposAria("clinica-cidade", errors.cidade?.message)}
            {...register("cidade")}
            disabled={desabilitado}
          />
        </FormField>

        <FormField id="clinica-estado" rotulo="Estado" erro={errors.estado?.message}>
          <Controller
            control={control}
            name="estado"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={desabilitado}
              >
                <SelectTrigger {...camposAria("clinica-estado", errors.estado?.message)}>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UF_BRASIL.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      {erroGeral ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroGeral}
        </p>
      ) : null}

      {somenteLeitura ? (
        <p className="text-sm text-muted-foreground">
          Apenas perfis owner ou admin podem alterar os dados da clínica.
        </p>
      ) : (
        <div className="flex justify-end">
          <Button type="submit" disabled={desabilitado || !isDirty}>
            {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Salvar alterações
          </Button>
        </div>
      )}
    </form>
  );
}
