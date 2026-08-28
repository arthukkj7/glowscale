"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLinkIcon, Loader2Icon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormField, camposAria } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cadastrar } from "@/lib/actions/auth";
import type { AcaoDoErro } from "@/lib/actions/result";
import {
  cadastroSchema,
  type CadastroFormValues,
  type CadastroInput,
} from "@/lib/validations";

export function CadastroForm() {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [acaoDoErro, setAcaoDoErro] = useState<AcaoDoErro | null>(null);
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CadastroFormValues, unknown, CadastroInput>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: {
      nome: "",
      email: "",
      senha: "",
      confirmarSenha: "",
      clinicaNome: "",
      telefone: "",
    },
  });

  function aoEnviar(valores: CadastroInput) {
    setErroGeral(null);
    setAcaoDoErro(null);
    startTransition(async () => {
      const resultado = await cadastrar(valores);
      if (!resultado.ok) {
        setErroGeral(resultado.erro);
        setAcaoDoErro(resultado.acao ?? null);
        return;
      }
      if (resultado.data.precisaConfirmarEmail) {
        setConfirmacaoPendente(true);
        return;
      }
      toast.success("Conta criada com sucesso.");
      router.replace(resultado.data.destino);
      router.refresh();
    });
  }

  if (confirmacaoPendente) {
    return (
      <div className="space-y-4 text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/12 text-success"
        >
          <MailCheckIcon className="size-6" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Confirme seu e-mail</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para o e-mail informado. Depois de confirmar,
            você volta para concluir a configuracao da clínica.
          </p>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="space-y-5" noValidate>
      <FormField id="nome" rotulo="Seu nome" erro={errors.nome?.message} obrigatorio>
        <Input
          {...camposAria("nome", errors.nome?.message)}
          {...register("nome")}
          autoComplete="name"
          placeholder="Como devemos te chamar"
          disabled={pendente}
        />
      </FormField>

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
          placeholder="Studio Bella Estética"
          disabled={pendente}
        />
      </FormField>

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

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          id="senha"
          rotulo="Senha"
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
          rotulo="Confirmar senha"
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
      </div>

      {erroGeral ? (
        <div
          role="alert"
          className="space-y-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <p>{erroGeral}</p>
          {acaoDoErro ? (
            <a
              href={acaoDoErro.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
            >
              {acaoDoErro.texto}
              <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" className="w-full" size="lg" disabled={pendente}>
        {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Criar conta
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
