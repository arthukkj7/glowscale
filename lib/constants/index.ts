import type {
  AssinaturaStatus,
  AtendimentoStatus,
  ClinicaStatus,
} from "@/types/database";

/** Timezone de negocio. Todas as datas do sistema sao interpretadas nele. */
export const BUSINESS_TIMEZONE = "America/Sao_Paulo";

export const APP_NAME = "GlowScale";
export const APP_DESCRIPTION =
  "Gestão de escalas, atendimentos e comissões para clínicas de estética.";

/** Status de clinica que liberam o uso do dashboard. */
export const CLINICA_STATUS_COM_ACESSO: readonly ClinicaStatus[] = [
  "trial",
  "active",
] as const;

export const CLINICA_STATUS_LABEL: Record<ClinicaStatus, string> = {
  trial: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  blocked: "Bloqueada",
};

export const ASSINATURA_STATUS_LABEL: Record<AssinaturaStatus, string> = {
  pending: "Aguardando pagamento",
  trial: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento em atraso",
  canceled: "Cancelada",
  expired: "Expirada",
};

export const ATENDIMENTO_STATUS_LABEL: Record<AtendimentoStatus, string> = {
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const UF_BRASIL = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA",
  "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN",
  "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

/** Nomes curtos dos dias da semana, iniciando na segunda-feira. */
export const DIAS_SEMANA_CURTOS = [
  "SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM",
] as const;

export const DIAS_SEMANA_LONGOS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
] as const;

/** Plano unico do MVP. Valor e nome sao configuraveis por ambiente. */
export const PLANO_PADRAO = {
  nome: process.env.NEXT_PUBLIC_PLANO_NOME ?? "Essencial",
  slug: "essencial",
  valor: Number(process.env.NEXT_PUBLIC_PLANO_VALOR ?? "97.00"),
  ciclo: "MONTHLY" as const,
  descricao: "Gestão completa de escalas, atendimentos e comissões.",
  beneficios: [
    "Profissionais e procedimentos ilimitados",
    "Escala semanal com múltiplos turnos",
    "Cálculo automático de comissão com snapshot",
    "Relatório financeiro por período e profissional",
    "Isolamento total dos dados da sua clínica",
  ],
} as const;

export const PAGINACAO_PADRAO = 20;
