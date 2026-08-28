"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Busca por nome ou telefone.
 *
 * Envia por formulario (GET) em vez de reagir a cada tecla: a consulta agrega
 * todo o historico do cliente, e disparar isso a cada letra digitada custaria
 * uma consulta pesada por caractere.
 */
export function BuscaClientes({ valorInicial }: { valorInicial?: string }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [termo, setTermo] = useState(valorInicial ?? "");

  function buscar(valor: string) {
    const query = new URLSearchParams(parametros.toString());
    if (valor.trim()) query.set("busca", valor.trim());
    else query.delete("busca");
    query.delete("pagina");
    router.push(`/clientes${query.toString() ? `?${query}` : ""}`);
  }

  return (
    <form
      role="search"
      onSubmit={(evento) => {
        evento.preventDefault();
        buscar(termo);
      }}
      className="flex gap-2"
    >
      <div className="relative flex-1 sm:max-w-xs">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Buscar por nome ou telefone"
          aria-label="Buscar cliente por nome ou telefone"
          className="pl-9"
        />
      </div>
      <Button type="submit" variant="outline">
        Buscar
      </Button>
      {valorInicial ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setTermo("");
            buscar("");
          }}
        >
          <XIcon className="size-4" aria-hidden="true" />
          Limpar
        </Button>
      ) : null}
    </form>
  );
}
