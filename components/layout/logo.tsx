import { cn } from "@/lib/utils";
import { GlowScaleMark } from "./glowscale-mark";

interface LogoProps {
  className?: string;
  /** Esconde o wordmark e deixa so o monograma (mobile, rodape). */
  compacta?: boolean;
  /** Lado do monograma em pixels. */
  tamanho?: number;
}

/**
 * Assinatura da marca: monograma + wordmark.
 *
 * O wordmark usa a serifa de display do tema, com "Glow" em peso normal e
 * "Scale" em semibold - a mudanca de peso separa as duas palavras sem
 * precisar de espaco extra nem de uma segunda cor.
 */
export function Logo({ className, compacta = false, tamanho = 32 }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <GlowScaleMark tamanho={tamanho} className="text-primary" />
      {!compacta ? (
        <span
          aria-hidden="true"
          className="texto-display text-[1.0625rem] leading-none tracking-tight"
        >
          Glow<span className="font-semibold">Scale</span>
        </span>
      ) : null}
      <span className="sr-only">GlowScale</span>
    </span>
  );
}
