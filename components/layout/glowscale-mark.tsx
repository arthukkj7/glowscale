import { cn } from "@/lib/utils";

/**
 * Marca do GlowScale: monograma GS.
 *
 * O "G" e um arco geometrico aberto a direita com a barra classica; o "S"
 * ocupa a abertura, formando um par que continua legivel a 16px - o tamanho
 * em que a marca vive na aba do navegador. Tudo em path, sem <text>, para
 * renderizar identico em qualquer navegador sem depender de fonte instalada.
 *
 * A geometria vive so aqui e em app/icon.svg (favicon) e nas imagens sociais.
 * Ao mexer na marca, mexa nos tres.
 */

/** Traçado do G: arco aberto a direita + barra horizontal ate o centro. */
const CAMINHO_G = "M24.11 16.7 A 8.8 8.8 0 1 0 24.11 31.3 L 24.11 24 L 19 24";

/** Traçado do S: espinha de duas curvas, peso optico pareado com o G. */
const CAMINHO_S =
  "M36.4 20.9 C 36.4 18.95 34.75 17.8 32.4 17.8 C 30.05 17.8 28.4 19 28.4 20.75 " +
  "C 28.4 24.5 36.6 23.3 36.6 27.5 C 36.6 29.45 34.85 30.6 32.5 30.6 " +
  "C 30.15 30.6 28.4 29.45 28.4 27.6";

interface GlowScaleMarkProps {
  /** Lado do quadrado, em pixels. */
  tamanho?: number;
  /**
   * `tile` desenha o quadrado arredondado na cor primaria com o monograma
   * vazado; `plano` desenha so o monograma, herdando a cor do texto.
   */
  variante?: "tile" | "plano";
  className?: string;
}

export function GlowScaleMark({
  tamanho = 32,
  variante = "tile",
  className,
}: GlowScaleMarkProps) {
  const emTile = variante === "tile";

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      {emTile ? <rect width="48" height="48" rx="11" fill="currentColor" /> : null}
      <g
        // Ajuste optico: o conjunto GS tem mais massa a esquerda, entao um
        // empurrao sutil para a direita e o que faz o desenho parecer centrado.
        transform="translate(0.7 0)"
        fill="none"
        stroke={emTile ? "var(--color-primary-foreground, #fff)" : "currentColor"}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={CAMINHO_G} strokeWidth="4.1" />
        <path d={CAMINHO_S} strokeWidth="3.7" />
      </g>
    </svg>
  );
}
