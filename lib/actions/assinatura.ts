"use server";

import { revalidatePath } from "next/cache";

import { asaasEstaConfigurado } from "@/lib/asaas/config";
import { obterOuCriarCliente } from "@/lib/asaas/customers";
import {
  buscarAssinatura,
  criarAssinatura,
  primeiraCobrancaEmAberto,
} from "@/lib/asaas/subscriptions";
import { requireSessao } from "@/lib/auth/session";
import { PLANO_PADRAO } from "@/lib/constants";
import { createAdminClient, serviceRoleDisponivel } from "@/lib/supabase/admin";
import { hojeNaClinica } from "@/lib/utils/date";
import { checkoutSchema } from "@/lib/validations";
import type { AssinaturaStatus } from "@/types/database";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

export interface ResultadoDoCheckout {
  urlPagamento: string | null;
  status: AssinaturaStatus;
}

function garantirIntegracaoDisponivel(): void {
  if (!asaasEstaConfigurado()) {
    throw new ErroDeNegocio(
      "A cobrança ainda não esta configurada nesta instalação. Configure ASAAS_API_KEY no servidor.",
    );
  }
  if (!serviceRoleDisponivel()) {
    throw new ErroDeNegocio(
      "A cobrança ainda não esta configurada nesta instalação. Configure SUPABASE_SERVICE_ROLE_KEY no servidor.",
    );
  }
}

/**
 * Cria (ou recupera) a assinatura da clinica no Asaas e devolve a URL de
 * pagamento.
 *
 * A escrita na tabela `assinaturas` usa service role de proposito: o papel
 * `authenticated` nao tem privilegio de INSERT/UPDATE nessa tabela, para que
 * ninguem consiga se auto-promover para status 'active' via PostgREST.
 */
export async function iniciarAssinatura(
  dados: unknown,
): Promise<ActionResult<ResultadoDoCheckout>> {
  try {
    const entrada = checkoutSchema.parse(dados);
    const { clinica, email } = await requireSessao();
    garantirIntegracaoDisponivel();

    const admin = createAdminClient();

    const { data: assinaturaAtual, error: erroLeitura } = await admin
      .from("assinaturas")
      .select("*")
      .eq("clinica_id", clinica.id)
      .maybeSingle();

    if (erroLeitura) throw erroLeitura;

    // Assinatura ja criada: devolve a fatura em aberto em vez de duplicar.
    if (assinaturaAtual?.asaas_subscription_id) {
      const cobranca = await primeiraCobrancaEmAberto(assinaturaAtual.asaas_subscription_id);
      const urlPagamento = cobranca?.invoiceUrl ?? assinaturaAtual.url_pagamento ?? null;

      if (urlPagamento && urlPagamento !== assinaturaAtual.url_pagamento) {
        await admin
          .from("assinaturas")
          .update({ url_pagamento: urlPagamento })
          .eq("clinica_id", clinica.id);
      }

      revalidatePath("/assinatura");
      return sucesso({ urlPagamento, status: assinaturaAtual.status });
    }

    const cliente = await obterOuCriarCliente({
      nome: clinica.nome,
      cpfCnpj: entrada.documento,
      email: clinica.email ?? email,
      telefone: entrada.telefone ?? clinica.telefone,
      referenciaExterna: clinica.id,
    });

    const assinaturaAsaas = await criarAssinatura({
      clienteId: cliente.id,
      valor: PLANO_PADRAO.valor,
      proximoVencimento: hojeNaClinica(clinica.timezone),
      ciclo: PLANO_PADRAO.ciclo,
      formaPagamento: entrada.formaPagamento,
      descricao: `GlowScale - plano ${PLANO_PADRAO.nome}`,
      referenciaExterna: clinica.id,
    });

    const cobranca = await primeiraCobrancaEmAberto(assinaturaAsaas.id);

    const { error: erroPersistencia } = await admin.from("assinaturas").upsert(
      {
        clinica_id: clinica.id,
        asaas_customer_id: cliente.id,
        asaas_subscription_id: assinaturaAsaas.id,
        status: "pending",
        plano: PLANO_PADRAO.slug,
        valor: PLANO_PADRAO.valor,
        ciclo: PLANO_PADRAO.ciclo,
        forma_pagamento: entrada.formaPagamento,
        url_pagamento: cobranca?.invoiceUrl ?? null,
        data_inicio: hojeNaClinica(clinica.timezone),
      },
      { onConflict: "clinica_id" },
    );

    if (erroPersistencia) throw erroPersistencia;

    // Documento fica registrado na clinica para futuras cobrancas.
    await admin.from("clinicas").update({ documento: entrada.documento }).eq("id", clinica.id);

    revalidatePath("/assinatura");
    revalidatePath("/configuracoes");

    return sucesso(
      { urlPagamento: cobranca?.invoiceUrl ?? null, status: "pending" },
      "Assinatura criada. Conclua o pagamento para liberar o acesso.",
    );
  } catch (erro) {
    return tratarErro("assinatura.iniciar", erro);
  }
}

/**
 * Reconsulta o Asaas e sincroniza o estado local.
 * Serve como rede de seguranca quando um webhook nao chega.
 */
export async function sincronizarAssinatura(): Promise<ActionResult<{ status: AssinaturaStatus }>> {
  try {
    const { clinica } = await requireSessao();
    garantirIntegracaoDisponivel();

    const admin = createAdminClient();

    const { data: assinatura, error } = await admin
      .from("assinaturas")
      .select("*")
      .eq("clinica_id", clinica.id)
      .maybeSingle();

    if (error) throw error;
    if (!assinatura?.asaas_subscription_id) {
      throw new ErroDeNegocio("Nenhuma assinatura foi criada para esta clínica ainda.");
    }

    const remota = await buscarAssinatura(assinatura.asaas_subscription_id);
    const cobranca = await primeiraCobrancaEmAberto(assinatura.asaas_subscription_id);

    const pagamentoConfirmado =
      cobranca !== null && ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(cobranca.status);
    const vencido = cobranca?.status === "OVERDUE";

    let status: AssinaturaStatus = assinatura.status;
    if (remota.status === "EXPIRED") status = "expired";
    else if (remota.status === "INACTIVE") status = "canceled";
    else if (pagamentoConfirmado) status = "active";
    else if (vencido) status = "past_due";

    await admin
      .from("assinaturas")
      .update({ status, url_pagamento: cobranca?.invoiceUrl ?? assinatura.url_pagamento })
      .eq("clinica_id", clinica.id);

    if (status === "active") {
      await admin.from("clinicas").update({ status: "active" }).eq("id", clinica.id);
    } else if (status === "past_due") {
      await admin.from("clinicas").update({ status: "past_due" }).eq("id", clinica.id);
    } else if (status === "canceled" || status === "expired") {
      await admin.from("clinicas").update({ status: "canceled" }).eq("id", clinica.id);
    }

    revalidatePath("/assinatura");
    revalidatePath("/", "layout");

    return sucesso({ status }, "Situação da assinatura atualizada.");
  } catch (erro) {
    return tratarErro("assinatura.sincronizar", erro);
  }
}
