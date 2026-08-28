"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatCurrencyMask, parseCurrencyInput } from "@/lib/calculations/money";

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: number | null;
  onValueChange: (valor: number | null) => void;
}

function mascararValor(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  return formatCurrencyMask(String(Math.round(valor * 100)));
}

/**
 * Campo monetario com mascara pt-BR. Devolve sempre um number (ou null),
 * nunca uma string solta para o caller interpretar.
 *
 * O texto digitado e estado local, mas precisa acompanhar mudancas externas
 * do valor (por exemplo, ao escolher um procedimento que preenche o preco).
 * Isso e feito ajustando o estado durante a renderizacao - o padrao que o
 * React recomenda para derivar estado de props, sem useEffect.
 */
export function CurrencyInput({ value, onValueChange, ...props }: CurrencyInputProps) {
  const [texto, setTexto] = React.useState(() => mascararValor(value));
  const [valorSincronizado, setValorSincronizado] = React.useState(value);

  if (value !== valorSincronizado) {
    setValorSincronizado(value);
    const valorDoTexto = parseCurrencyInput(texto);
    const precisaAtualizar =
      value === null || value === undefined
        ? valorDoTexto !== null
        : valorDoTexto === null || Math.abs(valorDoTexto - value) > 0.001;
    if (precisaAtualizar) setTexto(mascararValor(value));
  }

  function aoDigitar(evento: React.ChangeEvent<HTMLInputElement>) {
    const mascarado = formatCurrencyMask(evento.target.value);
    setTexto(mascarado);
    const novoValor = mascarado === "" ? null : parseCurrencyInput(mascarado);
    setValorSincronizado(novoValor);
    onValueChange(novoValor);
  }

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
      >
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="pl-9"
        value={texto}
        onChange={aoDigitar}
        placeholder="0,00"
      />
    </div>
  );
}
