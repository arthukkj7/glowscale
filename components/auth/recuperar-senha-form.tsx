"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";

import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { solicitarRecuperacaoDeSenha } from "@/lib/actions/auth";
import { recuperarSenhaSchema, type RecuperarSenhaInput } from "@/lib/validations";

export function RecuperarSenhaForm() {
  const [pendente, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecuperarSenhaInput>({
    resolver: zodResolver(recuperarSenhaSchema),
    defaultValues: { email: "" },
  });

  function aoEnviar(valores: RecuperarSenhaInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = await solicitarRecuperacaoDeSenha(valores);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      setMensagem(resultado.mensagem ?? "Instrucoes enviadas.");
    });
  }

  if (mensagem) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-success/10 px-3 py-3 text-sm text-foreground" role="status">
          {mensagem}
        </p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Voltar para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField id="email" rotulo="E-mail da conta" erro={errors.email?.message} obrigatorio>
        <Input
          {...camposAria("email", errors.email?.message)}
          {...register("email")}
          type="email"
          autoComplete="email"
          placeholder="voce@suaclinica.com.br"
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
        Enviar instrucoes
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
