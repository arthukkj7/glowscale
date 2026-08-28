"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { ROTULO_OAUTH, type ProvedorOAuth } from "@/lib/auth/oauth";
import { cn } from "@/lib/utils";
import { MarcaApple, MarcaFacebook, MarcaGoogle } from "./marcas-oauth";

const MARCA = {
  google: MarcaGoogle,
  facebook: MarcaFacebook,
  apple: MarcaApple,
} as const;

interface LoginSocialProps {
  provedores: ProvedorOAuth[];
  /** Rota interna para onde voltar depois do login. */
  proximo?: string;
}

/**
 * Botoes de login social.
 *
 * O fluxo roda no browser porque o Supabase precisa guardar o verificador PKCE
 * no navegador antes de sair para o provedor. A volta cai em /auth/callback,
 * que troca o code por sessao - o mesmo callback ja usado na confirmacao de
 * e-mail.
 */
export function LoginSocial({ provedores, proximo }: LoginSocialProps) {
  const [entrando, setEntrando] = useState<ProvedorOAuth | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (provedores.length === 0) return null;

  async function aoEntrar(provedor: ProvedorOAuth) {
    setErro(null);
    setEntrando(provedor);
    try {
      // Só caminhos internos: um "proximo" absoluto viraria open redirect.
      const destino = proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/dashboard";
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provedor,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?proximo=${encodeURIComponent(destino)}`,
        },
      });

      // Sem erro, o navegador ja esta saindo para o provedor: manter o spinner
      // evita um piscar de botao ativo durante o redirecionamento.
      if (error) {
        setErro(`Não foi possível entrar com ${ROTULO_OAUTH[provedor]}. Tente novamente.`);
        setEntrando(null);
      }
    } catch {
      setErro(`Não foi possível entrar com ${ROTULO_OAUTH[provedor]}. Tente novamente.`);
      setEntrando(null);
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 border-t border-dashed border-border" />
        <span className="text-xs text-muted-foreground">ou entre com</span>
        <span className="h-px flex-1 border-t border-dashed border-border" />
      </div>

      <div className="flex gap-3">
        {provedores.map((provedor) => {
          const Marca = MARCA[provedor];
          const carregando = entrando === provedor;
          return (
            <button
              key={provedor}
              type="button"
              onClick={() => aoEntrar(provedor)}
              disabled={entrando !== null}
              aria-label={`Entrar com ${ROTULO_OAUTH[provedor]}`}
              className={cn(
                "flex h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card",
                "transition-colors hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {carregando ? (
                <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Marca className="size-5" />
              )}
            </button>
          );
        })}
      </div>

      {erro ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
