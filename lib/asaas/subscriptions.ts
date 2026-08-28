import "server-only";

import { requisitarAsaas } from "./client";
import type {
  AssinaturaAsaas,
  CicloAsaas,
  CobrancaAsaas,
  FormaDePagamentoAsaas,
  ListaAsaas,
} from "./types";

export interface DadosDaAssinatura {
  clienteId: string;
  valor: number;
  /** Primeiro vencimento no formato yyyy-MM-dd. */
  proximoVencimento: string;
  ciclo: CicloAsaas;
  formaPagamento: FormaDePagamentoAsaas;
  descricao: string;
  referenciaExterna: string;
}

/** POST /subscriptions */
export async function criarAssinatura(dados: DadosDaAssinatura): Promise<AssinaturaAsaas> {
  return requisitarAsaas<AssinaturaAsaas>({
    method: "POST",
    path: "/subscriptions",
    body: {
      customer: dados.clienteId,
      billingType: dados.formaPagamento,
      value: dados.valor,
      nextDueDate: dados.proximoVencimento,
      cycle: dados.ciclo,
      description: dados.descricao,
      externalReference: dados.referenciaExterna,
    },
  });
}

/** GET /subscriptions/{id} */
export async function buscarAssinatura(id: string): Promise<AssinaturaAsaas> {
  return requisitarAsaas<AssinaturaAsaas>({ path: `/subscriptions/${encodeURIComponent(id)}` });
}

/** DELETE /subscriptions/{id} */
export async function cancelarAssinatura(id: string): Promise<{ deleted: boolean; id: string }> {
  return requisitarAsaas<{ deleted: boolean; id: string }>({
    method: "DELETE",
    path: `/subscriptions/${encodeURIComponent(id)}`,
  });
}

/**
 * GET /subscriptions/{id}/payments
 * Usado para descobrir a URL da fatura atual (invoiceUrl), onde a cliente
 * paga por PIX, cartao ou boleto conforme a forma escolhida.
 */
export async function listarCobrancasDaAssinatura(id: string): Promise<CobrancaAsaas[]> {
  const lista = await requisitarAsaas<ListaAsaas<CobrancaAsaas>>({
    path: `/subscriptions/${encodeURIComponent(id)}/payments`,
    query: { limit: 10 },
  });
  return lista.data;
}

/** Primeira cobranca em aberto da assinatura, se houver. */
export async function primeiraCobrancaEmAberto(id: string): Promise<CobrancaAsaas | null> {
  const cobrancas = await listarCobrancasDaAssinatura(id);
  const pendentes = cobrancas.filter((cobranca) =>
    ["PENDING", "AWAITING_RISK_ANALYSIS", "OVERDUE"].includes(cobranca.status),
  );
  return pendentes[0] ?? cobrancas[0] ?? null;
}
