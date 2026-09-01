"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { aplicarSegmento } from "@/lib/actions/segmento";
import { formatCurrency } from "@/lib/calculations/money";
import { SEGMENTOS } from "@/lib/segmentos";
import { cn } from "@/lib/utils";

/**
 * Escolha do tipo de negocio.
 *
 * Existe para eliminar o pior momento do produto: quem cria a conta encontra
 * seis formularios vazios antes de ver qualquer coisa util, e e ali que a
 * maioria vai embora. Um clique aqui deixa a agenda pronta para o primeiro
 * agendamento.
 *
 * A previa dos servicos aparece ANTES de confirmar porque a pessoa precisa
 * saber o que vai entrar na conta dela - aplicar um template as cegas e o tipo
 * de coisa que gera trabalho de limpeza.
 */
export function EscolherSegmento({ tipoAtual }: { tipoAtual?: string | null }) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState<string | null>(tipoAtual ?? null);
  const [pendente, startTransition] = useTransition();

  const segmento = SEGMENTOS.find((s) => s.id === escolhido);

  function aplicar(criarServicos: boolean) {
    if (!escolhido) return;
    startTransition(async () => {
      const resultado = await aplicarSegmento({ tipo_negocio: escolhido, criarServicos });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(resultado.mensagem ?? "Pronto.");
      router.refresh();
      if (resultado.data.servicosCriados > 0) router.push("/procedimentos");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SEGMENTOS.map((s) => {
          const ativo = escolhido === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setEscolhido(s.id)}
              aria-pressed={ativo}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ativo
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{s.nome}</span>
                {ativo ? (
                  <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                ) : null}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">{s.descricao}</span>
            </button>
          );
        })}
      </div>

      {segmento && segmento.servicos.length > 0 ? (
        <Card className="p-5">
          <p className="text-sm font-medium">
            Vamos cadastrar {segmento.servicos.length} serviços para começar
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            São um ponto de partida — você ajusta preço, duração e nome depois, e apaga o que
            não usa.
          </p>

          <ul className="mt-4 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {segmento.servicos.map((s) => (
              <li key={s.nome} className="flex justify-between gap-3">
                <span className="truncate text-muted-foreground">{s.nome}</span>
                <span className="shrink-0 tabular-nums">
                  {formatCurrency(s.valor)}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {s.duracaoMinutos}min
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => aplicar(true)} disabled={pendente}>
              {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Cadastrar esses serviços
            </Button>
            <Button variant="ghost" onClick={() => aplicar(false)} disabled={pendente}>
              Cadastro os meus
            </Button>
          </div>
        </Card>
      ) : segmento ? (
        <Button onClick={() => aplicar(false)} disabled={pendente}>
          {pendente ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Continuar
        </Button>
      ) : null}
    </div>
  );
}
