"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

/**
 * Boundary global. O detalhe tecnico fica no console do servidor; o usuario
 * ve apenas uma mensagem amigavel e a opcao de tentar de novo.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] erro nao tratado", { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <ErrorState acao={<Button onClick={reset}>Tentar novamente</Button>} />
      </div>
    </div>
  );
}
