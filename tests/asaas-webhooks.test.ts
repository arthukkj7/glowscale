import { describe, expect, it } from "vitest";

import { interpretarEvento } from "@/lib/asaas/webhooks";

describe("interpretarEvento", () => {
  it("libera o acesso quando o pagamento e confirmado ou recebido", () => {
    for (const evento of ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_RECEIVED_IN_CASH"]) {
      expect(interpretarEvento(evento)).toEqual({
        statusAssinatura: "active",
        statusClinica: "active",
      });
    }
  });

  it("marca inadimplencia em atraso, estorno e chargeback", () => {
    for (const evento of [
      "PAYMENT_OVERDUE",
      "PAYMENT_REFUNDED",
      "PAYMENT_CHARGEBACK_REQUESTED",
      "PAYMENT_CHARGEBACK_DISPUTE",
    ]) {
      expect(interpretarEvento(evento)).toEqual({
        statusAssinatura: "past_due",
        statusClinica: "past_due",
      });
    }
  });

  it("cancela quando a assinatura e removida ou inativada", () => {
    for (const evento of ["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"]) {
      expect(interpretarEvento(evento)).toEqual({
        statusAssinatura: "canceled",
        statusClinica: "canceled",
      });
    }
  });

  it("ignora eventos sem efeito sobre o acesso", () => {
    expect(interpretarEvento("PAYMENT_CREATED")).toBeNull();
    expect(interpretarEvento("SUBSCRIPTION_CREATED")).toBeNull();
    expect(interpretarEvento("EVENTO_DESCONHECIDO")).toBeNull();
  });
});
