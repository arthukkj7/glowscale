import { DatabaseIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

/**
 * Tela mostrada quando a instalacao ainda nao tem Supabase configurado.
 *
 * Sem banco e sem Auth, nenhuma tela de autenticacao pode funcionar. Deixar o
 * formulario aparecer so para falhar depois de preenchido e pior do que dizer
 * de saida o que falta - por isso esta tela substitui o formulario em vez de
 * conviver com ele.
 */
export function SetupNecessario() {
  return (
    <Card className="p-8">
      <div className="space-y-5">
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-warning/18 text-warning-foreground"
        >
          <DatabaseIcon className="size-5" />
        </span>

        <div className="space-y-1.5">
          <h1 className="texto-display text-xl font-semibold tracking-tight">
            Falta conectar o banco de dados
          </h1>
          <p className="text-sm text-muted-foreground">
            O GlowScale guarda clínicas, profissionais e atendimentos no Supabase. Enquanto
            as credenciais não estiverem configuradas, não é possível criar conta nem
            entrar.
          </p>
        </div>

        <ol className="space-y-3 text-sm">
          {[
            <>
              Crie um projeto gratuito em{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                supabase.com
              </a>
              .
            </>,
            <>
              Em <strong>Project Settings &rarr; API</strong>, copie a{" "}
              <em>Project URL</em> e a chave publicável.
            </>,
            <>
              Cole as duas em <code className="font-mono text-xs">.env.local</code>, na raiz
              do projeto.
            </>,
            <>
              No <strong>SQL Editor</strong>, cole o conteúdo de{" "}
              <code className="font-mono text-xs">supabase/instalar.sql</code> e rode.
            </>,
            <>Reinicie o servidor.</>,
          ].map((passo, indice) => (
            <li key={indice} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-semibold text-muted-foreground"
              >
                {indice + 1}
              </span>
              <span className="text-muted-foreground">{passo}</span>
            </li>
          ))}
        </ol>

        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          O passo a passo completo está no{" "}
          <code className="font-mono">README.md</code> e o modelo das variáveis em{" "}
          <code className="font-mono">.env.local.example</code>.
        </p>
      </div>
    </Card>
  );
}
