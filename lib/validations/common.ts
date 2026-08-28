import { z } from "zod";

import { UF_BRASIL } from "@/lib/constants";
import { parseCurrencyInput } from "@/lib/calculations/money";

/** Texto obrigatorio, com trim e limites explicitos. */
export function textoObrigatorio(campo: string, min = 2, max = 120) {
  return z
    .string({ message: `${campo} e obrigatorio.` })
    .trim()
    .min(min, `${campo} deve ter ao menos ${min} caracteres.`)
    .max(max, `${campo} deve ter no maximo ${max} caracteres.`);
}

/** Texto opcional: string vazia vira null. */
export function textoOpcional(max = 120) {
  return z
    .string()
    .trim()
    .max(max, `Use no maximo ${max} caracteres.`)
    .transform((valor) => (valor === "" ? null : valor))
    .nullable()
    .optional()
    .transform((valor) => valor ?? null);
}

export const emailOpcional = z
  .string()
  .trim()
  .max(200)
  .transform((valor) => (valor === "" ? null : valor))
  .nullable()
  .optional()
  .refine(
    (valor) => valor === null || valor === undefined || z.email().safeParse(valor).success,
    "Informe um e-mail valido.",
  )
  .transform((valor) => valor ?? null);

export const emailObrigatorio = z
  .string({ message: "E-mail e obrigatorio." })
  .trim()
  .toLowerCase()
  .min(1, "E-mail e obrigatorio.")
  .max(200, "E-mail muito longo.")
  .pipe(z.email("Informe um e-mail valido."));

export const telefoneOpcional = z
  .string()
  .trim()
  .max(20, "Telefone muito longo.")
  .transform((valor) => (valor === "" ? null : valor))
  .nullable()
  .optional()
  .refine(
    (valor) => valor === null || valor === undefined || /^[\d\s()+.-]{8,20}$/.test(valor),
    "Informe um telefone valido.",
  )
  .transform((valor) => valor ?? null);

export const ufOpcional = z
  .string()
  .trim()
  .toUpperCase()
  .transform((valor) => (valor === "" ? null : valor))
  .nullable()
  .optional()
  .refine(
    (valor) =>
      valor === null ||
      valor === undefined ||
      (UF_BRASIL as readonly string[]).includes(valor),
    "Selecione um estado valido.",
  )
  .transform((valor) => valor ?? null);

export const idUuid = z.uuid("Identificador invalido.");

/**
 * Valor monetario vindo de formulario. Aceita numero ou texto em pt-BR e
 * sempre devolve um number com no maximo 2 casas decimais.
 */
export const valorMonetario = z
  .union([z.string(), z.number()])
  .transform((valor, ctx) => {
    const parsed = parseCurrencyInput(valor);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "Informe um valor valido." });
      return z.NEVER;
    }
    return parsed;
  })
  .refine((valor) => valor >= 0, "O valor nao pode ser negativo.")
  .refine((valor) => valor <= 9_999_999.99, "Valor acima do limite permitido.");

/** Percentual de comissao: 0 a 100, ate 2 casas. */
export const percentualComissao = z
  .union([z.string(), z.number()])
  .transform((valor, ctx) => {
    const parsed = parseCurrencyInput(valor);
    if (parsed === null) {
      ctx.addIssue({ code: "custom", message: "Informe um percentual valido." });
      return z.NEVER;
    }
    return parsed;
  })
  .refine((valor) => valor >= 0 && valor <= 100, "A comissao deve estar entre 0 e 100.");

export const dataISO = z
  .string({ message: "Data e obrigatoria." })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data valida.")
  .refine((valor) => !Number.isNaN(new Date(`${valor}T00:00:00`).getTime()), "Data invalida.");

export const horaHHMM = z
  .string({ message: "Horario e obrigatorio." })
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM.");

export const booleanoDeFormulario = z
  .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on"), z.literal("")])
  .transform((valor) => valor === true || valor === "true" || valor === "on");
