/**
 * Os planos do GlowScale.
 *
 * Espelham exatamente limite_do_plano() e plano_libera() no banco. O banco e a
 * autoridade - o trigger la e que realmente barra - e este arquivo existe para
 * a interface saber o que oferecer e o que explicar. Se os dois divergirem, a
 * interface promete o que o banco recusa; por isso as duas listas andam juntas.
 */

export const PLANOS_PAGOS = ["solo", "studio", "scale"] as const;
export type PlanoPago = (typeof PLANOS_PAGOS)[number];
export type Plano = PlanoPago | "trial";

export type RecursoLimitado = "profissionais" | "usuarios" | "clientes";
export type RecursoExclusivo = "reativacao" | "relatorio_profissional" | "exportar";

export interface DefinicaoDePlano {
  id: PlanoPago;
  /** Nome comercial, em ingles por decisao de marca. */
  nome: string;
  precoMensal: number;
  /** Variavel de ambiente com o price_... correspondente no Stripe. */
  variavelDoPreco: string;
  limites: Record<RecursoLimitado, number | null>;
  recursos: Record<RecursoExclusivo, boolean>;
  /** Marcado na vitrine como a escolha da maioria. */
  destaque?: boolean;
}

export const PLANOS: Record<PlanoPago, DefinicaoDePlano> = {
  solo: {
    id: "solo",
    nome: "Solo",
    precoMensal: 47,
    variavelDoPreco: "STRIPE_PRICE_SOLO",
    limites: { profissionais: 1, usuarios: 1, clientes: 500 },
    recursos: { reativacao: false, relatorio_profissional: false, exportar: false },
  },
  studio: {
    id: "studio",
    nome: "Studio",
    precoMensal: 97,
    variavelDoPreco: "STRIPE_PRICE_STUDIO",
    limites: { profissionais: 5, usuarios: 3, clientes: null },
    recursos: { reativacao: true, relatorio_profissional: true, exportar: false },
    destaque: true,
  },
  scale: {
    id: "scale",
    nome: "Scale",
    precoMensal: 197,
    variavelDoPreco: "STRIPE_PRICE_SCALE",
    limites: { profissionais: null, usuarios: null, clientes: null },
    recursos: { reativacao: true, relatorio_profissional: true, exportar: true },
  },
};

export const ORDEM_DOS_PLANOS: PlanoPago[] = ["solo", "studio", "scale"];

/** Dias de teste antes da primeira cobranca. */
export const DIAS_DE_TESTE = 7;

/**
 * Durante o teste o negocio experimenta o plano mais completo.
 * Cobrar antes de mostrar o que o produto faz e o caminho mais curto para a
 * pessoa concluir que nao serve para ela.
 */
export function limiteDoPlano(plano: Plano, recurso: RecursoLimitado): number | null {
  if (plano === "trial") return null;
  return PLANOS[plano].limites[recurso];
}

export function planoLibera(plano: Plano, recurso: RecursoExclusivo): boolean {
  if (plano === "trial") return true;
  return PLANOS[plano].recursos[recurso];
}

/** Menor plano que libera o recurso. Usado para dizer "disponivel no Studio". */
export function planoNecessarioPara(recurso: RecursoExclusivo): PlanoPago {
  return ORDEM_DOS_PLANOS.find((p) => PLANOS[p].recursos[recurso]) ?? "scale";
}

/** Menor plano que comporta a quantidade pedida. */
export function planoNecessarioParaQuantidade(
  recurso: RecursoLimitado,
  quantidade: number,
): PlanoPago | null {
  return (
    ORDEM_DOS_PLANOS.find((p) => {
      const limite = PLANOS[p].limites[recurso];
      return limite === null || limite >= quantidade;
    }) ?? null
  );
}

export function ehPlanoPago(valor: string): valor is PlanoPago {
  return (PLANOS_PAGOS as readonly string[]).includes(valor);
}
