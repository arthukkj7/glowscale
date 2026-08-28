"use client";

import { CheckIcon, GlobeIcon } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trocarIdioma } from "@/lib/i18n/acoes";
import { IDIOMAS, IDIOMA_INFO, type Idioma } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Troca o idioma da interface.
 *
 * A bandeira sozinha nao basta como rotulo: bandeira e pais, nao idioma, e
 * quem usa leitor de tela ouviria so um emoji. Por isso o nome do idioma
 * acompanha, e o botao tem aria-label proprio.
 */
export function SeletorIdioma({
  idioma,
  className,
}: {
  idioma: Idioma;
  className?: string;
}) {
  const [pendente, startTransition] = useTransition();
  const atual = IDIOMA_INFO[idioma];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={pendente}
          aria-label={`Idioma: ${atual.nome}`}
          className={cn("gap-1.5", className)}
        >
          <span aria-hidden="true" className="text-base leading-none">
            {atual.bandeira}
          </span>
          <span className="text-xs font-medium">{atual.curto}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-48">
        {IDIOMAS.map((valor) => {
          const info = IDIOMA_INFO[valor];
          const selecionado = valor === idioma;
          return (
            <DropdownMenuItem
              key={valor}
              onSelect={() => startTransition(() => void trocarIdioma(valor))}
              className="gap-2.5"
            >
              <span aria-hidden="true" className="text-base leading-none">
                {info.bandeira}
              </span>
              <span className="flex-1">{info.nome}</span>
              {selecionado ? (
                <CheckIcon className="size-4 text-primary" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Versao com o globo, para onde nao cabe o codigo do idioma. */
export function SeletorIdiomaCompacto({ idioma }: { idioma: Idioma }) {
  const [pendente, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={pendente} aria-label="Trocar idioma">
          <GlobeIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {IDIOMAS.map((valor) => {
          const info = IDIOMA_INFO[valor];
          return (
            <DropdownMenuItem
              key={valor}
              onSelect={() => startTransition(() => void trocarIdioma(valor))}
              className="gap-2.5"
            >
              <span aria-hidden="true" className="text-base leading-none">
                {info.bandeira}
              </span>
              <span className="flex-1">{info.nome}</span>
              {valor === idioma ? (
                <CheckIcon className="size-4 text-primary" aria-hidden="true" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
