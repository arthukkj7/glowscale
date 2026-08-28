/**
 * Os planos do GlowScale.
 *
 * Dois NIVEIS de acesso - free e pro - e tres OFERTAS na vitrine, porque o Pro
 * e vendido em duas periodicidades. Mensal e anual liberam exatamente o mesmo:
 * o que muda e o preco. Travar recursos por periodo de cobranca seria
 * arbitrario; cobrar menos de quem paga adiantado e desconto.
 *
 * Espelha limite_do_plano() e plano_libera() no banco. O banco e a autoridade
 * - e o trigger la que realmente barra - e este arquivo existe para a
 * interface saber o que oferecer. Se divergirem, a tela promete o que o banco
 * recusa; por isso os dois andam juntos, e ha teste guardando a coerencia.
 */

/** Nivel de acesso. */
export const NIVEIS = ["free", "pro"] as const;
export type Nivel = (typeof NIVEIS)[number];
/** 'trial' nao e contratavel: e o estado dos primeiros dias. */
export type Plano = Nivel | "trial";

export type RecursoLimitado = "profissionais" | "usuarios" | "clientes";
export type RecursoExclusivo = "reativacao" | "relatorio_profissional" | "exportar";

export interface LimitesDoNivel {
  limites: Record<RecursoLimitado, number | null>;
  recursos: Record<RecursoExclusivo, boolean>;
}

export const NIVEL: Record<Nivel, LimitesDoNivel> = {
  free: {
    limites: { profissionais: 1, usuarios: 1, clientes: 30 },
    recursos: { reativacao: false, relatorio_profissional: false, exportar: false },
  },
  pro: {
    limites: { profissionais: null, usuarios: null, clientes: null },
    recursos: { reativacao: true, relatorio_profissional: true, exportar: true },
  },
};

/** As tres ofertas mostradas na vitrine. */
export const OFERTAS_PAGAS = ["pro_mensal", "pro_anual"] as const;
export type OfertaPaga = (typeof OFERTAS_PAGAS)[number];
export type Oferta = OfertaPaga | "free";

export interface DefinicaoDeOferta {
  id: Oferta;
  /** Nome comercial, em ingles por decisao de marca. */
  nome: string;
  nivel: Nivel;
  /** Valor cobrado de uma vez, na periodicidade da oferta. */
  preco: number;
  periodo: "mes" | "ano" | "sempre";
  /** Variavel de ambiente com o price_... no Stripe. Ausente no gratuito. */
  variavelDoPreco?: string;
  destaque?: boolean;
}

export const OFERTAS: Record<Oferta, DefinicaoDeOferta> = {
  free: { id: "free", nome: "Free", nivel: "free", preco: 0, periodo: "sempre" },
  pro_mensal: {
    id: "pro_mensal",
    nome: "Pro",
    nivel: "pro",
    preco: 47,
    periodo: "mes",
    variavelDoPreco: "STRIPE_PRICE_PRO_MENSAL",
  },
  pro_anual: {
    id: "pro_anual",
    nome: "Pro Anual",
    nivel: "pro",
    preco: 397,
    periodo: "ano",
    variavelDoPreco: "STRIPE_PRICE_PRO_ANUAL",
    destaque: true,
  },
};

export const ORDEM_DAS_OFERTAS: Oferta[] = ["free", "pro_mensal", "pro_anual"];

/** Dias de teste com acesso completo antes de cair para o gratuito. */
export const DIAS_DE_TESTE = 7;

/** Quanto o anual sai por mes. Usado para comparar com o mensal. */
export function mensalidadeEquivalente(oferta: OfertaPaga): number {
  const { preco, periodo } = OFERTAS[oferta];
  return periodo === "ano" ? preco / 12 : preco;
}

/** Quanto o anual economiza em um ano, contra pagar mes a mes. */
export function economiaAnual(): number {
  return OFERTAS.pro_mensal.preco * 12 - OFERTAS.pro_anual.preco;
}

/** Quantos meses o anual sai "de graca", arredondado para baixo. */
export function mesesGratisNoAnual(): number {
  return Math.floor(economiaAnual() / OFERTAS.pro_mensal.preco);
}

/**
 * Durante o teste o negocio experimenta o Pro. Cobrar antes de mostrar o que o
 * produto faz e o caminho mais curto para concluir que nao serve para ela.
 */
export function limiteDoPlano(plano: Plano, recurso: RecursoLimitado): number | null {
  if (plano === "trial") return null;
  return NIVEL[plano].limites[recurso];
}

export function planoLibera(plano: Plano, recurso: RecursoExclusivo): boolean {
  if (plano === "trial") return true;
  return NIVEL[plano].recursos[recurso];
}

export function ehOfertaPaga(valor: string): valor is OfertaPaga {
  return (OFERTAS_PAGAS as readonly string[]).includes(valor);
}

export function ehNivel(valor: string): valor is Nivel {
  return (NIVEIS as readonly string[]).includes(valor);
}
