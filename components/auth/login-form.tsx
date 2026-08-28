"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon, Loader2Icon, LockIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { entrar } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginInput } from "@/lib/validations";

export function LoginForm({ proximo }: { proximo?: string }) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  const idEmail = useId();
  const idSenha = useId();

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

  // O icone fica dentro do campo, entao o texto comeca depois dele (pl-10).
  const classeCampo = (temErro: boolean) =>
    cn(
      "w-full rounded-xl border bg-muted/40 py-2.5 pl-10 text-sm",
      "placeholder:text-muted-foreground/70",
      "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/40",
      "disabled:cursor-not-allowed disabled:opacity-60",
      temErro ? "border-destructive/60" : "border-border",
    );

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="w-full space-y-4" noValidate>
      <div className="space-y-1.5">
        {/* O rotulo e visualmente oculto, nao ausente: o desenho pede so o
            placeholder, mas um campo sem label nao e anunciado por leitor de
            tela e some assim que a pessoa comeca a digitar. */}
        <label htmlFor={idEmail} className="sr-only">
          E-mail
        </label>
        <div className="relative">
          <MailIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id={idEmail}
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="voce@suaclinica.com.br"
            disabled={pendente}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${idEmail}-erro` : undefined}
            className={classeCampo(Boolean(errors.email))}
          />
        </div>
        {errors.email ? (
          <p id={`${idEmail}-erro`} className="pl-1 text-xs text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={idSenha} className="sr-only">
          Senha
        </label>
        <div className="relative">
          <LockIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id={idSenha}
            {...register("senha")}
            type={senhaVisivel ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Sua senha"
            disabled={pendente}
            aria-invalid={errors.senha ? true : undefined}
            aria-describedby={errors.senha ? `${idSenha}-erro` : undefined}
            className={cn(classeCampo(Boolean(errors.senha)), "pr-10")}
          />
          <button
            type="button"
            onClick={() => setSenhaVisivel((v) => !v)}
            aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={senhaVisivel}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {senhaVisivel ? (
              <EyeOffIcon className="size-4" aria-hidden="true" />
            ) : (
              <EyeIcon className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.senha ? (
          <p id={`${idSenha}-erro`} className="pl-1 text-xs text-destructive">
            {errors.senha.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link
          href="/recuperar-senha"
          className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>

      {erroGeral ? (
        <p
          role="alert"
          className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {erroGeral}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pendente}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-xl py-2.5",
          "bg-gradient-to-b from-primary to-primary/85 text-sm font-medium text-primary-foreground",
          "shadow-sm transition hover:brightness-105",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-70",
        )}
      >
        {pendente ? <Loader2Icon className="size-4 animate-spin" aria-hidden="true" /> : null}
        Entrar
      </button>
    </form>
  );
}
