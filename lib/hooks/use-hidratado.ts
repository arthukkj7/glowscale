"use client";

import { useSyncExternalStore } from "react";

/** Nada muda depois: o valor so difere entre servidor e cliente. */
const semAssinatura = () => () => {};

/**
 * false durante a renderizacao no servidor e no primeiro desenho do cliente;
 * true depois da hidratacao.
 *
 * Serve para adiar o que so o navegador sabe - o tema preferido do aparelho,
 * por exemplo. Sem isso, o servidor desenha uma coisa, o cliente desenha
 * outra, e o React reclama de incompatibilidade.
 *
 * Feito com useSyncExternalStore em vez do classico
 * useEffect(() => setMontado(true), []): aquele padrao dispara uma segunda
 * renderizacao em cascata, e o React Compiler o rejeita. Aqui os dois valores
 * sao declarados de saida, um para cada lado, sem estado nenhum.
 */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
}
