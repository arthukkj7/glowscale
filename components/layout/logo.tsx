import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  compacta?: boolean;
}

/** Marca do GlowScale: monograma + wordmark, sem dependencia de imagem. */
export function Logo({ className, compacta = false }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
      >
        G
      </span>
      {!compacta ? (
        <span className="texto-display text-lg font-semibold tracking-tight">GlowScale</span>
      ) : null}
      <span className="sr-only">GlowScale</span>
    </span>
  );
}
