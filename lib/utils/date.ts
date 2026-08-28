import { TZDate } from "@date-fns/tz";
import { addDays, format, isValid, parse, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

import { BUSINESS_TIMEZONE, DIAS_SEMANA_CURTOS, DIAS_SEMANA_LONGOS } from "@/lib/constants";

/**
 * Datas de negocio (data_atendimento, escalas.data) sao DATE puro no banco,
 * sem hora e sem offset. Para nao sofrer deslocamento de fuso, elas circulam
 * na aplicacao como string "yyyy-MM-dd" e so viram Date local quando precisam
 * ser formatadas. O timezone America/Sao_Paulo e usado apenas para descobrir
 * qual e "hoje" para a clinica.
 */

export type DateOnly = string;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: string): value is DateOnly {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  return isValid(parse(value, "yyyy-MM-dd", new Date()));
}

/** "Hoje" no fuso de negocio, como "yyyy-MM-dd". */
export function hojeNaClinica(timezone: string = BUSINESS_TIMEZONE): DateOnly {
  const agora = new TZDate(Date.now(), timezone);
  return format(agora, "yyyy-MM-dd");
}

/** Converte "yyyy-MM-dd" em Date local (meia-noite), sem conversao de fuso. */
export function toLocalDate(value: DateOnly): Date {
  const [ano, mes, dia] = value.split("-").map(Number);
  return new Date(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1);
}

export function toDateOnly(date: Date): DateOnly {
  return format(date, "yyyy-MM-dd");
}

/** "2026-03-14" -> "14/03/2026" */
export function formatDateBR(value: DateOnly | null | undefined): string {
  if (!value || !isDateOnly(value)) return "-";
  return format(toLocalDate(value), "dd/MM/yyyy");
}

/** "2026-03-14" -> "14 de marco de 2026" */
export function formatDateLong(value: DateOnly): string {
  return format(toLocalDate(value), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** "2026-03-14" -> "sex, 14/03" */
export function formatDateShort(value: DateOnly): string {
  return format(toLocalDate(value), "EEE, dd/MM", { locale: ptBR });
}

/** "08:00:00" -> "08:00" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "-";
  const [hora, minuto] = value.split(":");
  if (hora === undefined || minuto === undefined) return value;
  return `${hora.padStart(2, "0")}:${minuto}`;
}

/** "08:00:00" + "18:00:00" -> "08:00 - 18:00" */
export function formatTurno(inicio: string, fim: string): string {
  return `${formatTime(inicio)} - ${formatTime(fim)}`;
}

/** Segunda-feira da semana que contem a data informada. */
export function inicioDaSemana(value: DateOnly): DateOnly {
  return toDateOnly(startOfWeek(toLocalDate(value), { weekStartsOn: 1 }));
}

export interface DiaDaSemana {
  data: DateOnly;
  rotuloCurto: string;
  rotuloLongo: string;
  indice: number;
}

/** Sete dias a partir da segunda-feira informada. */
export function diasDaSemana(segunda: DateOnly): DiaDaSemana[] {
  const base = toLocalDate(segunda);
  return Array.from({ length: 7 }, (_, indice) => ({
    data: toDateOnly(addDays(base, indice)),
    rotuloCurto: DIAS_SEMANA_CURTOS[indice] ?? "",
    rotuloLongo: DIAS_SEMANA_LONGOS[indice] ?? "",
    indice,
  }));
}

export function somarDias(value: DateOnly, dias: number): DateOnly {
  return toDateOnly(addDays(toLocalDate(value), dias));
}

/** Rotulo do intervalo semanal: "10 a 16 de marco de 2026". */
export function rotuloSemana(segunda: DateOnly): string {
  const inicio = toLocalDate(segunda);
  const fim = addDays(inicio, 6);
  const mesmoMes = inicio.getMonth() === fim.getMonth();
  const formatoInicio = mesmoMes ? "d" : "d 'de' MMM";
  return `${format(inicio, formatoInicio, { locale: ptBR })} a ${format(
    fim,
    "d 'de' MMMM 'de' yyyy",
    { locale: ptBR },
  )}`;
}

/** Primeiro dia do mes corrente no fuso da clinica. */
export function primeiroDiaDoMes(referencia: DateOnly = hojeNaClinica()): DateOnly {
  return `${referencia.slice(0, 7)}-01`;
}

/** Ultimo dia do mes da data informada. */
export function ultimoDiaDoMes(referencia: DateOnly = hojeNaClinica()): DateOnly {
  const base = toLocalDate(referencia);
  return toDateOnly(new Date(base.getFullYear(), base.getMonth() + 1, 0));
}

/** Formata um timestamptz do banco para exibicao no fuso da clinica. */
export function formatDateTimeBR(
  value: string | null | undefined,
  timezone: string = BUSINESS_TIMEZONE,
): string {
  if (!value) return "-";
  const data = new Date(value);
  if (!isValid(data)) return "-";
  return format(new TZDate(data, timezone), "dd/MM/yyyy 'as' HH:mm");
}

/**
 * Primeiro e ultimo dia do mes anterior a referencia.
 *
 * Feito com aritmetica sobre a string "yyyy-MM-dd" em vez de Date: 31 de marco
 * menos um mes em JavaScript da 3 de marco (o dia 31 nao existe em fevereiro e
 * o Date transborda). Aqui o mes anterior e sempre o mes inteiro.
 */
export function mesAnterior(referencia: DateOnly): { inicio: DateOnly; fim: DateOnly } {
  const [ano, mes] = referencia.split("-").map(Number) as [number, number, number];
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const inicio = `${anoAnterior}-${String(mesAnterior).padStart(2, "0")}-01` as DateOnly;
  return { inicio, fim: ultimoDiaDoMes(inicio) };
}

/**
 * Chave da saudacao conforme a hora no fuso do negocio.
 *
 * Devolve a chave do catalogo, nao o texto: a saudacao precisa acompanhar o
 * idioma escolhido, e a hora precisa acompanhar o fuso do NEGOCIO. Sao duas
 * coisas diferentes - alguem com a interface em ingles num salao de Sao Paulo
 * deve ler "Good evening" as 19h de Brasilia, nao as 19h de Londres.
 *
 * Sem o fuso explicito, a Vercel (que roda em UTC) diria "boa noite" as 18h.
 */
export function chaveDaSaudacao(
  timezone: string = BUSINESS_TIMEZONE,
): "bomDia" | "boaTarde" | "boaNoite" {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hora < 12) return "bomDia";
  if (hora < 18) return "boaTarde";
  return "boaNoite";
}
