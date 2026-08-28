"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] erro ao renderizar", { digest: error.digest });
  }, [error]);

  return <ErrorState acao={<Button onClick={reset}>Tentar novamente</Button>} />;
}
