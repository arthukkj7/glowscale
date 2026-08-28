import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations/money";
import { DIAS_DE_TESTE, OFERTAS, ORDEM_DAS_OFERTAS } from "@/lib/planos";
import {
  PARA_QUEM,
  VANTAGEM,
  beneficiosDoNivel,
  equivalenciaMensal,
} from "@/lib/planos/beneficios";
import { cn } from "@/lib/utils";

/**
 * Preços na vitrine.
 *
 * Componente de servidor: a lista de benefícios vem da mesma definição que o
 * banco usa para aplicar os limites.
 *
 * Mostra as três ofertas mesmo sem preço configurado no Stripe: quem visita
 * está decidindo se o produto serve, e uma tabela com buracos parece produto
 * incompleto. A checagem de disponibilidade acontece no checkout.
 */
export function PlanosVitrine() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {ORDEM_DAS_OFERTAS.map((id) => {
        const oferta = OFERTAS[id];
        const gratuito = id === "free";
        const equivalencia = equivalenciaMensal(id);
        const vantagem = VANTAGEM[id];

        return (
          <Card
            key={id}
            className={cn(
              "relative flex flex-col p-7",
              oferta.destaque && "border-primary/50 shadow-lg shadow-primary/5",
            )}
          >
            {oferta.destaque ? (
              <Badge className="absolute -top-2.5 left-7">Melhor valor</Badge>
            ) : null}

            <h3 className="texto-display text-xl font-semibold">{oferta.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{PARA_QUEM[id]}</p>

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="texto-display text-4xl font-semibold">
                {gratuito ? "R$ 0" : formatCurrency(oferta.preco)}
              </span>
              <span className="text-sm text-muted-foreground">
                {gratuito ? "para sempre" : oferta.periodo === "ano" ? "/ ano" : "/ mês"}
              </span>
            </p>

            {/* A equivalência mensal do anual é o que torna a comparação
                possível: R$ 397 e R$ 47 não se comparam sozinhos. */}
            <p className="mt-1 h-5 text-sm text-muted-foreground">{equivalencia ?? ""}</p>

            {vantagem ? (
              <p
                className={cn(
                  "mt-3 rounded-md px-3 py-2 text-sm",
                  oferta.destaque
                    ? "bg-success/12 font-medium text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {vantagem}
              </p>
            ) : (
              <p className="mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                Sem cartão, sem prazo para acabar
              </p>
            )}

            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {beneficiosDoNivel(oferta.nivel).map((linha) => (
                <li key={linha} className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-muted-foreground">{linha}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-7 w-full"
              size="lg"
              variant={oferta.destaque ? "default" : "outline"}
              asChild
            >
              <Link href="/cadastro">
                {gratuito ? "Começar de graça" : `Testar ${DIAS_DE_TESTE} dias grátis`}
              </Link>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
