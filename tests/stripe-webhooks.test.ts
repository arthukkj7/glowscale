import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { extrairDados, interpretarStatus } from "@/lib/stripe/webhooks";

/**
 * O que estes testes protegem: dinheiro e acesso.
 *
 * Um mapeamento errado aqui ou libera o sistema para quem nao pagou, ou tira
 * do ar uma clinica que esta em dia. Sao os dois erros mais caros do produto.
 */
describe("interpretarStatus", () => {
  it("libera o acesso quando a assinatura esta ativa", () => {
    expect(interpretarStatus("active")).toEqual({
      statusAssinatura: "active",
      statusClinica: "active",
    });
  });

  it("trata trial como acesso liberado", () => {
    expect(interpretarStatus("trialing")).toEqual({
      statusAssinatura: "trial",
      statusClinica: "trial",
    });
  });

  it("marca inadimplencia sem apagar a assinatura", () => {
    for (const status of ["past_due", "unpaid", "paused"] as const) {
      expect(interpretarStatus(status)).toEqual({
        statusAssinatura: "past_due",
        statusClinica: "past_due",
      });
    }
  });

  it("cancela quando o Stripe cancela", () => {
    expect(interpretarStatus("canceled")).toEqual({
      statusAssinatura: "canceled",
      statusClinica: "canceled",
    });
  });

  it("não derruba o acesso de quem apenas começou o checkout", () => {
    // 'incomplete' e quem abriu o checkout e ainda nao pagou. Derrubar aqui
    // tiraria do ar uma clinica em periodo de teste que so foi assinar.
    const efeito = interpretarStatus("incomplete");
    expect(efeito.statusAssinatura).toBe("pending");
    expect(efeito.statusClinica).toBeNull();
  });

  it("expira quando o checkout incompleto caduca", () => {
    expect(interpretarStatus("incomplete_expired")).toEqual({
      statusAssinatura: "expired",
      statusClinica: "canceled",
    });
  });

  it("nunca libera acesso por um status desconhecido", () => {
    const efeito = interpretarStatus("algum_status_novo" as Stripe.Subscription.Status);
    expect(efeito.statusAssinatura).toBe("pending");
    expect(efeito.statusClinica).toBeNull();
  });
});

const evento = (type: string, object: unknown): Stripe.Event =>
  ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;

describe("extrairDados", () => {
  it("tira o id da clínica do client_reference_id do checkout", () => {
    const d = extrairDados(
      evento("checkout.session.completed", {
        client_reference_id: "clinica-1",
        customer: "cus_1",
        subscription: "sub_1",
      }),
    );
    expect(d).toEqual({
      clinicaId: "clinica-1",
      customerId: "cus_1",
      subscriptionId: "sub_1",
      status: null,
    });
  });

  it("aceita customer e subscription expandidos em objeto", () => {
    const d = extrairDados(
      evento("checkout.session.completed", {
        metadata: { clinica_id: "clinica-2" },
        customer: { id: "cus_2" },
        subscription: { id: "sub_2" },
      }),
    );
    expect(d?.customerId).toBe("cus_2");
    expect(d?.subscriptionId).toBe("sub_2");
    expect(d?.clinicaId).toBe("clinica-2");
  });

  it("lê o status direto do evento de assinatura", () => {
    const d = extrairDados(
      evento("customer.subscription.updated", {
        id: "sub_3",
        status: "past_due",
        customer: "cus_3",
        metadata: { clinica_id: "clinica-3" },
      }),
    );
    expect(d?.status).toBe("past_due");
    expect(d?.subscriptionId).toBe("sub_3");
  });

  it("trata subscription.deleted como cancelamento mesmo com corpo 'active'", () => {
    // O Stripe entrega o objeto no estado anterior a exclusao; confiar no
    // campo status deixaria a clinica ativa depois de cancelar.
    const d = extrairDados(
      evento("customer.subscription.deleted", {
        id: "sub_4",
        status: "active",
        customer: "cus_4",
        metadata: { clinica_id: "clinica-4" },
      }),
    );
    expect(d?.status).toBe("canceled");
  });

  it("mapeia fatura paga e fatura recusada", () => {
    expect(
      extrairDados(evento("invoice.paid", { customer: "cus_5", subscription: "sub_5" }))?.status,
    ).toBe("active");
    expect(
      extrairDados(evento("invoice.payment_failed", { customer: "cus_5" }))?.status,
    ).toBe("past_due");
  });

  it("ignora eventos que não entendemos", () => {
    expect(extrairDados(evento("customer.created", { id: "cus_9" }))).toBeNull();
    expect(extrairDados(evento("payout.paid", { id: "po_1" }))).toBeNull();
  });

  it("não inventa clínica quando o evento não traz identificação", () => {
    const d = extrairDados(evento("checkout.session.completed", { customer: "cus_6" }));
    expect(d?.clinicaId).toBeNull();
  });
});
