import type { Idioma } from "@/lib/i18n/config";

/**
 * Bandeiras do seletor de idioma, desenhadas em SVG.
 *
 * Nao sao emoji (🇧🇷 / 🇺🇸) por um motivo pratico: o Windows nao traz as fontes
 * de bandeira, e o navegador cai no par de letras - "BR" e "US" aparecem como
 * texto no lugar do desenho. Como parte do publico usa Windows, o emoji falha
 * justamente onde precisa funcionar.
 *
 * Em SVG inline, nao <img> de CDN: sao dois desenhos minusculos que vao junto
 * do HTML, sem requisicao extra e sem depender de host de terceiro.
 *
 * Proporcao 4:3 nas duas, em vez das oficiais (10:7 no Brasil, 19:10 nos EUA):
 * num menu, larguras diferentes desalinham os itens, e a diferenca e
 * imperceptivel a 20 pixels.
 */

const BORDA = "rounded-[2px] ring-1 ring-black/10";

export function BandeiraBrasil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 15"
      className={`${BORDA} ${className ?? ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="15" fill="#009739" />
      <path d="M10 1.6 18.4 7.5 10 13.4 1.6 7.5Z" fill="#FEDD00" />
      <circle cx="10" cy="7.5" r="3.3" fill="#012169" />
      {/* A faixa e uma lua entre dois arcos, com as pontas ja apoiadas no
          circulo. Recortar com clipPath exigiria um id, e o componente
          renderiza duas vezes na mesma pagina (botao e item do menu) - dois
          ids iguais no documento. Assim nao ha id nenhum. */}
      <path d="M6.76 6.9 Q10 10.8 13.24 6.9 Q10 9.6 6.76 6.9 Z" fill="#fff" />
    </svg>
  );
}

export function BandeiraEUA({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 15"
      className={`${BORDA} ${className ?? ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="15" fill="#fff" />
      {/* 13 listras: 7 vermelhas desenhadas sobre o fundo branco. */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} y={(i * 15) / 6.5} width="20" height={15 / 13} fill="#B31942" />
      ))}
      <rect width="8.5" height={(15 / 13) * 7} fill="#0A3161" />
      {/* A 20 pixels, pontos leem como estrelas melhor do que estrelas. */}
      {[1.25, 3.95, 6.65].map((y) =>
        [1.4, 3.3, 5.2, 7.1].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.42" fill="#fff" />
        )),
      )}
      {[2.6, 5.3].map((y) =>
        [2.35, 4.25, 6.15].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="0.42" fill="#fff" />
        )),
      )}
    </svg>
  );
}

/** Bandeira do idioma. */
export function Bandeira({ idioma, className }: { idioma: Idioma; className?: string }) {
  return idioma === "pt-BR" ? (
    <BandeiraBrasil className={className} />
  ) : (
    <BandeiraEUA className={className} />
  );
}
