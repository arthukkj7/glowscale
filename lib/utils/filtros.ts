import type { AtendimentoStatus } from "@/types/database";
import { isDateOnly, primeiroDiaDoMes, ultimoDiaDoMes } from "./date";

export interface ParametrosDeFiltro {
  dataInicial?: string;
  dataFinal?: string;
  profissionalId?: string;
  status?: string;
}

export interface FiltroNormalizado {
  dataInicial: string;
  dataFinal: string;
  /** null significa "todas as profissionais". */
  profissionalId: string | null;
  /** null significa "todos os status". */
  status: AtendimentoStatus | null;
  /** Valores como voltam para os campos do formulario. */
  bruto: { profissionalId: string; status: string };
  temFiltroAtivo: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Normaliza os parametros de URL em filtros seguros.
 *
 * Entradas invalidas caem no padrao (mes corrente, atendimentos realizados)
 * em vez de virarem erro: o usuario nunca ve uma pagina quebrada por causa de
 * um parametro digitado a mao. O id de profissional so passa se tiver formato
 * de UUID; a autorizacao real continua sendo do RLS.
 */
export function normalizarFiltro(
  parametros: ParametrosDeFiltro,
  hoje: string,
): FiltroNormalizado {
  const inicioPadrao = primeiroDiaDoMes(hoje);
  const fimPadrao = ultimoDiaDoMes(hoje);

  let dataInicial =
    parametros.dataInicial && isDateOnly(parametros.dataInicial)
      ? parametros.dataInicial
      : inicioPadrao;
  let dataFinal =
    parametros.dataFinal && isDateOnly(parametros.dataFinal) ? parametros.dataFinal : fimPadrao;

  if (dataInicial > dataFinal) {
    [dataInicial, dataFinal] = [dataFinal, dataInicial];
  }

  const profissionalBruto = parametros.profissionalId ?? "todas";
  const profissionalId = UUID.test(profissionalBruto) ? profissionalBruto : null;

  const statusBruto = parametros.status ?? "realizado";
  const status: AtendimentoStatus | null =
    statusBruto === "realizado" || statusBruto === "cancelado" ? statusBruto : null;

  return {
    dataInicial,
    dataFinal,
    profissionalId,
    status,
    bruto: {
      profissionalId: profissionalId ?? "todas",
      status: statusBruto === "todos" ? "todos" : (status ?? "realizado"),
    },
    temFiltroAtivo:
      dataInicial !== inicioPadrao ||
      dataFinal !== fimPadrao ||
      profissionalId !== null ||
      statusBruto !== "realizado",
  };
}

/** Reconstroi a query string preservando os filtros ativos. */
export function queryComFiltros(
  filtro: FiltroNormalizado,
  extras: Record<string, string> = {},
): string {
  const query = new URLSearchParams({
    dataInicial: filtro.dataInicial,
    dataFinal: filtro.dataFinal,
    profissionalId: filtro.bruto.profissionalId,
    status: filtro.bruto.status,
    ...extras,
  });
  return query.toString();
}
