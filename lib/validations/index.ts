import { z } from "zod";

import {
  booleanoDeFormulario,
  dataISO,
  emailObrigatorio,
  emailOpcional,
  horaHHMM,
  idUuid,
  percentualComissao,
  telefoneOpcional,
  textoObrigatorio,
  textoOpcional,
  ufOpcional,
  valorMonetario,
} from "./common";

export * from "./common";

// ---------------------------------------------------------------- autenticacao
export const loginSchema = z.object({
  email: emailObrigatorio,
  senha: z.string().min(1, "Informe sua senha."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const cadastroSchema = z
  .object({
    nome: textoObrigatorio("Nome"),
    email: emailObrigatorio,
    senha: z
      .string()
      .min(8, "A senha deve ter ao menos 8 caracteres.")
      .max(72, "A senha deve ter no máximo 72 caracteres.")
      .regex(/[a-zA-Z]/, "A senha deve conter ao menos uma letra.")
      .regex(/\d/, "A senha deve conter ao menos um número."),
    confirmarSenha: z.string(),
    clinicaNome: textoObrigatorio("Nome da clínica"),
    telefone: telefoneOpcional,
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    message: "As senhas não conferem.",
    path: ["confirmarSenha"],
  });
export type CadastroInput = z.infer<typeof cadastroSchema>;

export const recuperarSenhaSchema = z.object({ email: emailObrigatorio });
export type RecuperarSenhaInput = z.infer<typeof recuperarSenhaSchema>;

export const redefinirSenhaSchema = z
  .object({
    senha: z
      .string()
      .min(8, "A senha deve ter ao menos 8 caracteres.")
      .max(72, "A senha deve ter no máximo 72 caracteres.")
      .regex(/[a-zA-Z]/, "A senha deve conter ao menos uma letra.")
      .regex(/\d/, "A senha deve conter ao menos um número."),
    confirmarSenha: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmarSenha, {
    message: "As senhas não conferem.",
    path: ["confirmarSenha"],
  });
export type RedefinirSenhaInput = z.infer<typeof redefinirSenhaSchema>;

// --------------------------------------------------------------- profissionais
export const profissionalSchema = z.object({
  nome: textoObrigatorio("Nome"),
  email: emailOpcional,
  telefone: telefoneOpcional,
  especialidade: textoOpcional(80),
  percentual_comissao: percentualComissao,
  ativo: booleanoDeFormulario.default(true),
});
export type ProfissionalInput = z.infer<typeof profissionalSchema>;

export const profissionalUpdateSchema = profissionalSchema.extend({ id: idUuid });
export type ProfissionalUpdateInput = z.infer<typeof profissionalUpdateSchema>;

// --------------------------------------------------------------- procedimentos
export const procedimentoSchema = z.object({
  nome: textoObrigatorio("Nome"),
  descricao: textoOpcional(500),
  valor: valorMonetario,
  duracao_minutos: z.coerce
    .number({ message: "Informe a duração." })
    .int("A duração deve ser um número inteiro.")
    .min(1, "A duração deve ser de ao menos 1 minuto.")
    .max(1440, "A duração deve ser de no máximo 1440 minutos."),
  ativo: booleanoDeFormulario.default(true),
});
export type ProcedimentoInput = z.infer<typeof procedimentoSchema>;

export const procedimentoUpdateSchema = procedimentoSchema.extend({ id: idUuid });
export type ProcedimentoUpdateInput = z.infer<typeof procedimentoUpdateSchema>;

// ---------------------------------------------------------------- atendimentos
export const atendimentoSchema = z.object({
  profissional_id: idUuid,
  procedimento_id: idUuid,
  data_atendimento: dataISO,
  quantidade: z.coerce
    .number({ message: "Informe a quantidade." })
    .int("A quantidade deve ser um número inteiro.")
    .min(1, "A quantidade deve ser maior que zero.")
    .max(1000, "Quantidade acima do limite permitido."),
  valor_unitario: valorMonetario,
  status: z.enum(["realizado", "cancelado"]).default("realizado"),
  observacoes: textoOpcional(1000),
});
export type AtendimentoInput = z.infer<typeof atendimentoSchema>;

export const atendimentoUpdateSchema = atendimentoSchema.extend({ id: idUuid });
export type AtendimentoUpdateInput = z.infer<typeof atendimentoUpdateSchema>;

// --------------------------------------------------------------------- escalas
export const escalaSchema = z
  .object({
    profissional_id: idUuid,
    data: dataISO,
    hora_inicio: horaHHMM,
    hora_fim: horaHHMM,
    observacoes: textoOpcional(500),
  })
  .refine((dados) => dados.hora_inicio < dados.hora_fim, {
    message: "O horário final deve ser maior que o inicial.",
    path: ["hora_fim"],
  });
export type EscalaInput = z.infer<typeof escalaSchema>;

export const escalaUpdateSchema = z
  .object({
    id: idUuid,
    profissional_id: idUuid,
    data: dataISO,
    hora_inicio: horaHHMM,
    hora_fim: horaHHMM,
    observacoes: textoOpcional(500),
  })
  .refine((dados) => dados.hora_inicio < dados.hora_fim, {
    message: "O horário final deve ser maior que o inicial.",
    path: ["hora_fim"],
  });
export type EscalaUpdateInput = z.infer<typeof escalaUpdateSchema>;

// --------------------------------------------------------------------- clinica
export const clinicaSchema = z.object({
  nome: textoObrigatorio("Nome"),
  nome_fantasia: textoOpcional(120),
  email: emailOpcional,
  telefone: telefoneOpcional,
  cidade: textoOpcional(80),
  estado: ufOpcional,
});
export type ClinicaInput = z.infer<typeof clinicaSchema>;

// ------------------------------------------------------------------ financeiro
export const filtroFinanceiroSchema = z.object({
  dataInicial: dataISO,
  dataFinal: dataISO,
  profissionalId: z.union([idUuid, z.literal("todas")]).default("todas"),
  status: z.enum(["realizado", "cancelado", "todos"]).default("realizado"),
});
export type FiltroFinanceiroInput = z.infer<typeof filtroFinanceiroSchema>;

// -------------------------------------------------------------------- checkout
export const checkoutSchema = z.object({
  documento: z
    .string({ message: "Informe o CPF ou CNPJ." })
    .trim()
    .transform((valor) => valor.replace(/\D/g, ""))
    .refine((valor) => valor.length === 11 || valor.length === 14, "Informe um CPF ou CNPJ válido."),
  formaPagamento: z.enum(["PIX", "CREDIT_CARD", "BOLETO"]).default("PIX"),
  telefone: telefoneOpcional,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// Tipos de ENTRADA dos formularios (antes das transformacoes do Zod).
// Usados como primeiro generico do useForm; a saida transformada e o terceiro.
export type CadastroFormValues = z.input<typeof cadastroSchema>;
export type ProfissionalFormValues = z.input<typeof profissionalSchema>;
export type ProcedimentoFormValues = z.input<typeof procedimentoSchema>;
export type AtendimentoFormValues = z.input<typeof atendimentoSchema>;
export type EscalaFormValues = z.input<typeof escalaSchema>;
export type ClinicaFormValues = z.input<typeof clinicaSchema>;
export type CheckoutFormValues = z.input<typeof checkoutSchema>;
export type FiltroFinanceiroFormValues = z.input<typeof filtroFinanceiroSchema>;
