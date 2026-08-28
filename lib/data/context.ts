import "server-only";

import { requireActiveSubscription, type SessaoClinica } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export interface ContextoDaClinica {
  supabase: Awaited<ReturnType<typeof createClient>>;
  sessao: SessaoClinica;
  clinicaId: string;
}

/**
 * Contexto padrao das consultas do painel.
 *
 * O clinica_id vem sempre da sessao (nunca do request) e ainda assim e
 * aplicado explicitamente em cada query: RLS e a garantia, o filtro e a
 * defesa em profundidade.
 */
export async function contextoDaClinica(): Promise<ContextoDaClinica> {
  const sessao = await requireActiveSubscription();
  const supabase = await createClient();
  return { supabase, sessao, clinicaId: sessao.clinica.id };
}

export interface ResultadoPaginado<T> {
  registros: T[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export function calcularIntervalo(pagina: number, porPagina: number) {
  const paginaSegura = Number.isFinite(pagina) && pagina > 0 ? Math.floor(pagina) : 1;
  const inicio = (paginaSegura - 1) * porPagina;
  return { inicio, fim: inicio + porPagina - 1, pagina: paginaSegura };
}

export function montarPaginacao<T>(
  registros: T[],
  total: number,
  pagina: number,
  porPagina: number,
): ResultadoPaginado<T> {
  return {
    registros,
    total,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}
