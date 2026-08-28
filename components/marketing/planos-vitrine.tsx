import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations/money";
import { DIAS_DE_TESTE, ORDEM_DOS_PLANOS, PLANOS, type PlanoPago } from "@/lib/planos";
import { cn } from "@/lib/utils";

/**
 * Preços na vitrine.
 *
 * Componente de servidor, montado a partir da MESMA definicao que o banco usa
 * para aplicar os limites. Escrever os planos a mao aqui e o caminho garantido
 * para a vitrine anunciar um limite e o sistema aplicar outro.
 *
 * Mostra os tres sempre, mesmo os que ainda nao tem preco no Stripe: quem
 * visita esta decidindo se o produto serve, e uma tabela com buracos passa a
 * impressao de produto incompleto. A checagem de disponibilidade acontece no
 * checkout, onde ela importa.
 */
function beneficios(plano: PlanoPago): string[] {
  const { limites, recursos } = PLANOS[plano];
  const linhas: string[] = [];

  linhas.push(
    limites.profissionais === null
      ? "Profissionais ilimitados"
      : limites.profissionais === 1
        ? "1 profissional (você)"
        : `Até ${limites.profissionais} profissionais`,
  );
  linhas.push(
    limites.clientes === null
      ? "Clientes ilimitados"
      : `Até ${limites.clientes.toLocaleString("pt-BR")} clientes`,
  );
  linhas.push("Agenda que não deixa marcar dois no mesmo horário");
  linhas.push("Comissão calculada sozinha, com histórico");
  linhas.push("Relatório financeiro por período");

  if (recursos.reativacao) linhas.push("Lista de clientes que sumiram");
  if (recursos.relatorio_profissional) linhas.push("Comparativo entre profissionais");
  if (recursos.exportar) linhas.push("Exportar seus dados quando quiser");

  return linhas;
}

const PARA_QUEM: Record<PlanoPago, string> = {
  solo: "Para quem atende sozinha",
  studio: "Para quem tem equipe",
  scale: "Para quem tem mais de um espaço",
};

export function PlanosVitrine() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {ORDEM_DOS_PLANOS.map((id) => {
        const plano = PLANOS[id];
        return (
          <Card
            key={id}
            className={cn(
              "relative flex flex-col p-7",
              plano.destaque && "border-primary/50 shadow-lg shadow-primary/5",
            )}
          >
            {plano.destaque ? (
              <Badge className="absolute -top-2.5 left-7">Mais escolhido</Badge>
            ) : null}

            <h3 className="texto-display text-xl font-semibold">{plano.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{PARA_QUEM[id]}</p>

            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="texto-display text-4xl font-semibold">
                {formatCurrency(plano.precoMensal)}
              </span>
              <span className="text-sm text-muted-foreground">/ mês</span>
            </p>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {beneficios(id).map((linha) => (
                <li key={linha} className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="text-muted-foreground">{linha}</span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-7 w-full"
              size="lg"
              variant={plano.destaque ? "default" : "outline"}
              asChild
            >
              <Link href="/cadastro">Testar {DIAS_DE_TESTE} dias grátis</Link>
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
