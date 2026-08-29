/**
 * Normalizacao de telefone para o link do WhatsApp.
 *
 * O wa.me exige o numero completo, so digitos, com o codigo do pais e SEM o
 * sinal de mais: 5511999998888. Qualquer coisa fora disso abre o aplicativo
 * numa conversa vazia ou num numero errado - e a pessoa so descobre depois de
 * mandar a mensagem.
 *
 * O que chega do cadastro e o que a recepcao digitou: "(11) 99999-8888",
 * "11999998888", "+55 11 99999-8888". Todos precisam virar a mesma coisa.
 */

const DDI_BRASIL = "55";

/**
 * Converte o que foi digitado no formato que o wa.me aceita.
 * Devolve null quando o numero nao tem cara de celular alcancavel.
 */
export function paraWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null;

  const digitos = telefone.replace(/\D/g, "");
  if (digitos === "") return null;

  // Ja veio com o DDI: 55 + DDD (2) + numero (8 ou 9).
  if (digitos.startsWith(DDI_BRASIL) && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }

  // DDD + celular de 9 digitos, o formato atual.
  if (digitos.length === 11) return DDI_BRASIL + digitos;

  // DDD + 8 digitos: fixo, ou celular no formato antigo. Nao inserimos o nono
  // digito por conta propria - um numero que "parece certo" e esta errado e
  // pior do que um botao que nao aparece.
  if (digitos.length === 10) return DDI_BRASIL + digitos;

  // Numero internacional ja completo, sem o + na frente.
  if (digitos.length >= 11 && digitos.length <= 15) return digitos;

  return null;
}

/** true quando da para montar um link do WhatsApp com este numero. */
export function temWhatsApp(telefone: string | null | undefined): boolean {
  return paraWhatsApp(telefone) !== null;
}

/**
 * Link do WhatsApp com a mensagem ja escrita.
 *
 * Usa wa.me, nao a API oficial da Meta, de proposito: abre o aplicativo com o
 * texto pronto e a pessoa revisa antes de enviar. Sem aprovacao de template,
 * sem custo por conversa, e sem o risco de o sistema mandar sozinho uma
 * mensagem no nome de alguem.
 */
export function linkDoWhatsApp(
  telefone: string | null | undefined,
  mensagem: string,
): string | null {
  const numero = paraWhatsApp(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}
