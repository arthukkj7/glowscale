"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { entrar } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm({ proximo }: { proximo?: string }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", senha: "" },
  });

  function aoEnviar(valores: LoginInput) {
    setErroGeral(null);
    startTransition(async () => {
      const resultado = await entrar(valores);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        return;
      }
      toast.success("Bem-vinda de volta!");
      router.replace(proximo && proximo.startsWith("/") ? proximo : resultado.data.destino);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField id="email" rotulo="E-mail" erro={errors.email?.message} obrigatorio>
        <Input
          {...camposAria("email", errors.email?.message)}
          {...register("email")}
          type="email"
          autoComplete="email"
          placeholder="voce@suaclinica.com.br"
          disabled={pendente}
        />
      </FormField>

      <FormField id="senha" rotulo="Senha" erro={errors.senha?.message} obrigatorio>
        <Input
          {...camposAria("senha", errors.senha?.message)}
          {...register("senha")}
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
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
        Entrar
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <Link href="/recuperar-senha" className="underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
        <p>
          Ainda nao tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </form>
  );
}
