/**
 * Tipos do banco no formato esperado pelo supabase-js.
 *
 * Este arquivo espelha `supabase/migrations/001_initial_schema.sql`.
 * Quando o Supabase CLI estiver disponivel, ele pode ser regenerado com:
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public > types/database.ts
 *
 * Colunas geradas pelo banco (valor_total, valor_comissao, valor_clinica)
 * aparecem em Row, mas nunca em Insert/Update.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ClinicaStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "blocked";

export type UsuarioRole = "owner" | "admin" | "manager" | "professional";

export type AtendimentoStatus = "realizado" | "cancelado";

export type AssinaturaStatus =
  | "pending"
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

type Timestamps = {
  created_at: string;
  updated_at: string;
}

export type ClinicaRow = Timestamps & {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  timezone: string;
  status: ClinicaStatus;
}

export type UsuarioRow = Timestamps & {
  id: string;
  auth_user_id: string;
  clinica_id: string;
  nome: string;
  email: string;
  role: UsuarioRole;
  ativo: boolean;
}

export type ProfissionalRow = Timestamps & {
  id: string;
  clinica_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  especialidade: string | null;
  percentual_comissao: number;
  ativo: boolean;
}

export type ProcedimentoRow = Timestamps & {
  id: string;
  clinica_id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  duracao_minutos: number;
  ativo: boolean;
}

export type AtendimentoRow = Timestamps & {
  id: string;
  clinica_id: string;
  cliente_id: string | null;
  profissional_id: string;
  procedimento_id: string;
  data_atendimento: string;
  quantidade: number;
  valor_unitario: number;
  comissao_percentual: number;
  /** coluna gerada pelo banco */
  valor_total: number;
  /** coluna gerada pelo banco */
  valor_comissao: number;
  /** coluna gerada pelo banco */
  valor_clinica: number;
  status: AtendimentoStatus;
  observacoes: string | null;
}

export type EscalaRow = Timestamps & {
  id: string;
  clinica_id: string;
  profissional_id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  observacoes: string | null;
}

/** Quem cobra a mensalidade desta clinica. */
export type ProvedorDePagamento = "asaas" | "stripe";

export type ClienteRow = Timestamps & {
  id: string;
  clinica_id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  ativo: boolean;
}

/** Linha devolvida por clientes_com_resumo(): cadastro + agregados. */
export type ClienteComResumo = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
  total_gasto: number;
  total_atendimentos: number;
  ultimo_atendimento: string | null;
  profissional_preferida: string | null;
}

export type AssinaturaRow = Timestamps & {
  id: string;
  clinica_id: string;
  provedor: ProvedorDePagamento;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: AssinaturaStatus;
  plano: string;
  valor: number;
  ciclo: string;
  forma_pagamento: string;
  url_pagamento: string | null;
  data_inicio: string | null;
  data_fim: string | null;
}

export type WebhookEventoRow = {
  id: string;
  event_id: string;
  event_type: string;
  payload: Json;
  processado_em: string;
}

/** As duas tabelas de eventos tem a mesma forma; o namespace do id e que muda. */
export type AsaasWebhookEventoRow = WebhookEventoRow;
export type StripeWebhookEventoRow = WebhookEventoRow;

type Insertable<Row, Required extends keyof Row, Generated extends keyof Row = never> = Partial<
  Omit<Row, Required | Generated>
> &
  Pick<Row, Required>;

export type Database = {
  public: {
    Tables: {
      clinicas: {
        Row: ClinicaRow;
        Insert: Insertable<ClinicaRow, "nome", "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ClinicaRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      usuarios: {
        Row: UsuarioRow;
        Insert: Insertable<
          UsuarioRow,
          "auth_user_id" | "clinica_id" | "nome" | "email",
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Omit<UsuarioRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      profissionais: {
        Row: ProfissionalRow;
        Insert: Insertable<
          ProfissionalRow,
          "clinica_id" | "nome",
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Omit<ProfissionalRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      procedimentos: {
        Row: ProcedimentoRow;
        Insert: Insertable<
          ProcedimentoRow,
          "clinica_id" | "nome" | "valor",
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Omit<ProcedimentoRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      atendimentos: {
        Row: AtendimentoRow;
        Insert: Insertable<
          AtendimentoRow,
          | "clinica_id"
          | "profissional_id"
          | "procedimento_id"
          | "data_atendimento"
          | "valor_unitario"
          | "comissao_percentual",
          | "id"
          | "created_at"
          | "updated_at"
          | "valor_total"
          | "valor_comissao"
          | "valor_clinica"
        >;
        Update: Partial<
          Omit<
            AtendimentoRow,
            | "id"
            | "created_at"
            | "updated_at"
            | "valor_total"
            | "valor_comissao"
            | "valor_clinica"
          >
        >;
        Relationships: [];
      };
      escalas: {
        Row: EscalaRow;
        Insert: Insertable<
          EscalaRow,
          "clinica_id" | "profissional_id" | "data" | "hora_inicio" | "hora_fim",
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Omit<EscalaRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      clientes: {
        Row: ClienteRow;
        Insert: Insertable<ClienteRow, "clinica_id" | "nome", "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ClienteRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      assinaturas: {
        Row: AssinaturaRow;
        Insert: Insertable<AssinaturaRow, "clinica_id", "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AssinaturaRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      asaas_webhook_eventos: {
        Row: AsaasWebhookEventoRow;
        Insert: Insertable<AsaasWebhookEventoRow, "event_id" | "event_type" | "payload", "id" | "processado_em">;
        Update: Partial<Omit<AsaasWebhookEventoRow, "id">>;
        Relationships: [];
      };
      stripe_webhook_eventos: {
        Row: StripeWebhookEventoRow;
        Insert: Insertable<StripeWebhookEventoRow, "event_id" | "event_type" | "payload", "id" | "processado_em">;
        Update: Partial<Omit<StripeWebhookEventoRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_clinica_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      get_user_role: {
        Args: Record<string, never>;
        Returns: UsuarioRole | null;
      };
      clientes_com_resumo: {
        Args: {
          p_busca?: string | null;
          p_apenas_ativos?: boolean;
          p_limite?: number;
          p_deslocamento?: number;
          p_cliente_id?: string | null;
        };
        Returns: ClienteComResumo[];
      };
      relatorio_financeiro: {
        Args: {
          p_data_inicial: string;
          p_data_final: string;
          p_profissional_id?: string | null;
          p_status?: AtendimentoStatus | null;
        };
        Returns: {
          profissional_id: string;
          profissional_nome: string;
          quantidade: number;
          faturamento: number;
          comissao: number;
          valor_clinica: number;
          comissao_percentual_media: number;
        }[];
      };
      resumo_financeiro: {
        Args: {
          p_data_inicial: string;
          p_data_final: string;
          p_profissional_id?: string | null;
          p_status?: AtendimentoStatus | null;
        };
        Returns: {
          quantidade: number;
          faturamento: number;
          comissao: number;
          valor_clinica: number;
        }[];
      };
      criar_clinica_com_usuario: {
        Args: {
          p_clinica_nome: string;
          p_usuario_nome: string;
          p_telefone?: string | null;
          p_cidade?: string | null;
          p_estado?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      clinica_status: ClinicaStatus;
      usuario_role: UsuarioRole;
      atendimento_status: AtendimentoStatus;
      assinatura_status: AssinaturaStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
