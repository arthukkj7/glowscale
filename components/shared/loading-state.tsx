import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TabelaSkeleton({ linhas = 5, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <Card className="p-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando dados...</span>
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: linhas }).map((_, linha) => (
          <div key={linha} className="flex gap-3">
            {Array.from({ length: colunas }).map((__, coluna) => (
              <Skeleton key={coluna} className="h-8 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CardsSkeleton({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Carregando indicadores...</span>
      {Array.from({ length: quantidade }).map((_, indice) => (
        <Card key={indice} className="space-y-3 p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </Card>
      ))}
    </div>
  );
}

export function PaginaSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <CardsSkeleton />
      <TabelaSkeleton />
    </div>
  );
}
