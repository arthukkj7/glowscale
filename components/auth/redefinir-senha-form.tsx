"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redefinirSenha } from "@/lib/actions/auth";
import { redefinirSenhaSchema, type RedefinirSenhaInput } from "@/lib/validations";

export function RedefinirSenhaForm() {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedefinirSenhaInput>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { senha: "", confirmarSenha: "" },
  });

  function aoEnviar(valores: RedefinirSenhaInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = await redefinirSenha(valores);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Senha alterada.");
      router.replace(resultado.data.destino);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField
        id="senha"
        rotulo="Nova senha"
        erro={errors.senha?.message}
        descricao="Mínimo de 8 caracteres, com letras e números."
        obrigatorio
      >
        <Input
          {...camposAria("senha", errors.senha?.message, "Mínimo de 8 caracteres.")}
          {...register("senha")}
          type="password"
          autoComplete="new-password"
          disabled={pendente}
        />
      </FormField>

      <FormField
        id="confirmarSenha"
        rotulo="Confirmar nova senha"
        erro={errors.confirmarSenha?.message}
        obrigatorio
      >
        <Input
          {...camposAria("confirmarSenha", errors.confirmarSenha?.message)}
          {...register("confirmarSenha")}
          type="password"
          autoComplete="new-password"
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
        Salvar nova senha
      </Button>
    </form>
  );
}
