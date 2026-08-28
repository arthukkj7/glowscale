"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { concluirOnboarding } from "@/lib/actions/auth";
import { telefoneOpcional, textoObrigatorio } from "@/lib/validations/common";

const schema = z.object({
  clinicaNome: textoObrigatorio("Nome da clínica"),
  usuarioNome: textoObrigatorio("Seu nome"),
  telefone: telefoneOpcional,
});

type Valores = z.input<typeof schema>;
type ValoresValidados = z.output<typeof schema>;

interface OnboardingFormProps {
  nomeSugerido: string;
  clinicaSugerida: string;
}

export function OnboardingForm({ nomeSugerido, clinicaSugerida }: OnboardingFormProps) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores, unknown, ValoresValidados>({
    resolver: zodResolver(schema),
    defaultValues: {
      clinicaNome: clinicaSugerida,
      usuarioNome: nomeSugerido,
      telefone: "",
    },
  });

  function aoEnviar(valores: ValoresValidados) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = await concluirOnboarding(valores);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success("Clínica configurada.");
      router.replace(resultado.data.destino);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField
        id="clinicaNome"
        rotulo="Nome da clínica"
        erro={errors.clinicaNome?.message}
        obrigatorio
      >
        <Input
          {...camposAria("clinicaNome", errors.clinicaNome?.message)}
          {...register("clinicaNome")}
          autoComplete="organization"
          disabled={pendente}
        />
      </FormField>

      <FormField id="usuarioNome" rotulo="Seu nome" erro={errors.usuarioNome?.message} obrigatorio>
        <Input
          {...camposAria("usuarioNome", errors.usuarioNome?.message)}
          {...register("usuarioNome")}
          autoComplete="name"
          disabled={pendente}
        />
      </FormField>

      <FormField id="telefone" rotulo="Telefone" erro={errors.telefone?.message}>
        <Input
          {...camposAria("telefone", errors.telefone?.message)}
          {...register("telefone")}
          type="tel"
          autoComplete="tel"
          placeholder="(11) 90000-0000"
          disabled={pendente}
        />
      </FormField>

      {erroGeral ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erroGeral}
        </p>
      ) : null}

      <Button type="submit" className="w-full" size="lg" disabled={pendente}>
        {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Concluir configuracao
      </Button>
    </form>
  );
}
