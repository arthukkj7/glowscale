"use client";

import { ThemeProvider } from "next-themes";

/**
 * Tema claro/escuro.
 *
 * attribute="class" porque o globals.css ja define a paleta escura sob `.dark`
 * - eram 102 tokens de cor escritos e nunca usados, porque nada adicionava a
 * classe. Este provedor e o que faltava.
 *
 * defaultTheme="system" respeita a preferencia do aparelho: quem trabalha com
 * o celular ao lado da cliente ja escolheu isso uma vez, no sistema.
 *
 * disableTransitionOnChange evita que a troca anime cada cor da tela de uma
 * vez - fica lento e parece defeito.
 */
export function ProvedorTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
