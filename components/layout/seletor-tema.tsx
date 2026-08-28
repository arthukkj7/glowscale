"use client";

import { CheckIcon, LaptopIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHidratado } from "@/lib/hooks/use-hidratado";

const OPCOES = [
  { valor: "light", rotulo: "Claro", icone: SunIcon },
  { valor: "dark", rotulo: "Escuro", icone: MoonIcon },
  { valor: "system", rotulo: "Do sistema", icone: LaptopIcon },
] as const;

export function SeletorTema() {
  const { theme, setTheme } = useTheme();

  // O tique so aparece depois da hidratacao: o servidor nao sabe qual tema o
  // aparelho prefere, e desenhar um palpite causaria incompatibilidade.
  const hidratado = useHidratado();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Tema da interface">
          {/* Os dois icones sao desenhados, e o CSS esconde um. Assim o icone
              certo aparece no primeiro quadro, sem esperar o JavaScript e sem
              estado nenhum - a classe .dark no <html> ja carrega a resposta. */}
          <SunIcon className="size-4 dark:hidden" aria-hidden="true" />
          <MoonIcon className="hidden size-4 dark:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-40">
        {OPCOES.map(({ valor, rotulo, icone: Icone }) => (
          <DropdownMenuItem key={valor} onSelect={() => setTheme(valor)} className="gap-2.5">
            <Icone className="size-4" aria-hidden="true" />
            <span className="flex-1">{rotulo}</span>
            {hidratado && theme === valor ? (
              <CheckIcon className="size-4 text-primary" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
