import {
  NIVEL,
  OFERTAS,
  economiaAnual,
  mesesGratisNoAnual,
  type Nivel,
  type Oferta,
} from "./index";

/**
 * O que cada oferta entrega, em texto.
 *
 * Montado a partir da mesma definicao que o banco usa para aplicar os limites.
 * Escrever a lista a mao em cada tela e o caminho garantido para a vitrine
 * anunciar um limite e o sistema aplicar outro.
 */
export function beneficiosDoNivel(nivel: Nivel): string[] {
  const { limites, recursos } = NIVEL[nivel];
  const linhas: string[] = [];

  linhas.push(
    limites.profissionais === null
      ? "Profissionais ilimitadas"
      : limites.profissionais === 1
        ? "1 profissional (você)"
        : `Até ${limites.profissionais} profissionais`,
  );
  linhas.push(
    limites.clientes === null
      ? "Clientes ilimitadas"
      : `Até ${limites.clientes} clientes`,
  );

  linhas.push("Agenda que não deixa marcar dois no mesmo horário");
  linhas.push("Serviços e atendimentos ilimitados");
  linhas.push("Comissão calculada sozinha, com histórico");

  if (recursos.reativacao) linhas.push("Lista de clientes que sumiram");
  if (recursos.relatorio_profissional) linhas.push("Comparativo entre profissionais");
  if (recursos.exportar) linhas.push("Exportar seus dados quando quiser");

  return linhas;
}

/** Para quem cada oferta e. Aparece embaixo do nome, no card. */
export const PARA_QUEM: Record<Oferta, string> = {
  free: "Para começar e conhecer",
  pro_mensal: "Para quem já vive disso",
  pro_anual: "Para quem já decidiu",
};

/**
 * A vantagem de escolher esta oferta e nao a anterior.
 *
 * O gratuito nao tem: ele e o ponto de partida, nao uma escolha sobre outro.
 */
export const VANTAGEM: Record<Oferta, string | null> = {
  free: null,
  pro_mensal: "Tudo sem limite, e você cancela quando quiser",
  pro_anual: `${mesesGratisNoAnual()} meses grátis — economia de R$ ${economiaAnual()} por ano`,
};

/** Linha do preço: "R$ 397/ano" vira "equivale a R$ 33,08/mês". */
export function equivalenciaMensal(oferta: Oferta): string | null {
  const def = OFERTAS[oferta];
  if (def.periodo !== "ano") return null;
  const mensal = def.preco / 12;
  return `equivale a R$ ${mensal.toFixed(2).replace(".", ",")}/mês`;
}
