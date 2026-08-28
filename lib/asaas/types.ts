/**
 * Tipos da API Asaas usados pelo GlowScale.
 *
 * Apenas os campos efetivamente consumidos estao declarados. Ver
 * docs/asaas.md para as suposicoes documentadas sobre a integracao.
 */

export type FormaDePagamentoAsaas = "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";

export type CicloAsaas =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "YEARLY";

export type StatusAssinaturaAsaas = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface ClienteAsaas {
  id: string;
  name: string;
  email?: string | null;
  cpfCnpj?: string | null;
  mobilePhone?: string | null;
  externalReference?: string | null;
}

export interface AssinaturaAsaas {
  id: string;
  customer: string;
  value: number;
  nextDueDate: string;
  cycle: CicloAsaas;
  billingType: FormaDePagamentoAsaas;
  status: StatusAssinaturaAsaas;
  description?: string | null;
  externalReference?: string | null;
}

export interface CobrancaAsaas {
  id: string;
  customer: string;
  subscription?: string | null;
  value: number;
  status: string;
  dueDate: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  externalReference?: string | null;
}

export interface ListaAsaas<T> {
  object: string;
  hasMore: boolean;
  totalCount: number;
  limit: number;
  offset: number;
  data: T[];
}

/** Envelope enviado pelo Asaas nos webhooks. */
export interface EventoWebhookAsaas {
  id: string;
  event: string;
  dateCreated?: string;
  payment?: CobrancaAsaas;
  subscription?: AssinaturaAsaas;
}
