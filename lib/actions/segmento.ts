"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/session";
import { buscarSegmento, IDS_DE_SEGMENTO } from "@/lib/segmentos";
import { createClient } from "@/lib/supabase/server";
import { ErroDeNegocio, sucesso, tratarErro, type ActionResult } from "./result";

const esquema = z.object({
  tipo_negocio: z.string().refine((v) => IDS_DE_SEGMENTO.includes(v), "Tipo de negócio inválido."),
  /** Falso quando a pessoa só quer registrar o tipo, sem cadastrar nada. */
  criarServicos: z.boolean().default(true),
});

/**
 * Registra o tipo de negocio e, se pedido, cadastra os servicos sugeridos.
 *
 * A insercao ignora o que ja existe com o mesmo nome, em vez de falhar: quem
 * aplica o template uma segunda vez espera completar a lista, nao receber um
 * erro de duplicata.
 */
export async function aplicarSegmento(
  dados: unknown,
): Promise<ActionResult<{ servicosCriados: number }>> {
  try {
    const entrada = esquema.parse(dados);
    const { clinica } = await requireAdmin();
    const supabase = await createClient();

    const { error: erroTipo } = await supabase
      .from("clinicas")
      .update({ tipo_negocio: entrada.tipo_negocio })
      .eq("id", clinica.id);
    if (erroTipo) throw erroTipo;

    let servicosCriados = 0;

    if (entrada.criarServicos) {
      const segmento = buscarSegmento(entrada.tipo_negocio);
      if (!segmento) throw new ErroDeNegocio("Tipo de negócio não encontrado.");

      if (segmento.servicos.length > 0) {
        const { data: existentes, error: erroLeitura } = await supabase
          .from("procedimentos")
          .select("nome")
          .eq("clinica_id", clinica.id);
        if (erroLeitura) throw erroLeitura;

        const jaTem = new Set((existentes ?? []).map((p) => p.nome.trim().toLowerCase()));
        const novos = segmento.servicos.filter((s) => !jaTem.has(s.nome.toLowerCase()));

        if (novos.length > 0) {
          const { error: erroInsercao, count } = await supabase
            .from("procedimentos")
            .insert(
              novos.map((s) => ({
                clinica_id: clinica.id,
                nome: s.nome,
                valor: s.valor,
                duracao_minutos: s.duracaoMinutos,
                ativo: true,
              })),
              { count: "exact" },
            );
          if (erroInsercao) throw erroInsercao;
          servicosCriados = count ?? novos.length;
        }
      }
    }

    for (const rota of ["/dashboard", "/procedimentos", "/configuracoes", "/agenda"]) {
      revalidatePath(rota);
    }

    return sucesso(
      { servicosCriados },
      servicosCriados > 0
        ? `${servicosCriados} serviços cadastrados. Ajuste os preços quando quiser.`
        : "Tipo de negócio salvo.",
    );
  } catch (erro) {
    return tratarErro("segmento.aplicar", erro);
  }
}
