import { formatCurrency } from "@/lib/calculations/money";
import { formatDateBR } from "@/lib/utils/date";

/**
 * Textos sugeridos para o WhatsApp.
 *
 * Sao rascunhos: o link abre o aplicativo com o texto pronto e a pessoa edita
 * antes de enviar. Por isso soam como alguem escrevendo, nao como sistema -
 * a cliente vai ler isso no mesmo lugar onde conversa com a familia.
 *
 * Sem emoji em excesso e sem "prezado(a)": num salao, a mensagem vem da
 * profissional, e ela nao fala assim.
 */

export interface DadosDaMensagem {
  clienteNome: string;
  negocioNome: string;
  profissionalNome?: string;
  servicoNome?: string;
  data?: string;
  hora?: string;
  valor?: number;
  diasSemVir?: number;
}

/** So o primeiro nome: "Maria Aparecida da Silva" vira "Maria". */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function confirmacaoDeAgendamento(d: DadosDaMensagem): string {
  const quando = d.data ? `${formatDateBR(d.data)}${d.hora ? ` às ${d.hora}` : ""}` : "";
  const com = d.profissionalNome ? ` com ${primeiroNome(d.profissionalNome)}` : "";
  return (
    `Oi, ${primeiroNome(d.clienteNome)}! Tudo bem?\n\n` +
    `Passando para confirmar seu horário${quando ? ` em ${quando}` : ""}` +
    `${d.servicoNome ? ` para ${d.servicoNome}` : ""}${com}.\n\n` +
    `Pode confirmar para mim? 💗\n${d.negocioNome}`
  );
}

export function lembreteDeHorario(d: DadosDaMensagem): string {
  const quando = d.hora ? `hoje às ${d.hora}` : "hoje";
  return (
    `Oi, ${primeiroNome(d.clienteNome)}! Só passando para lembrar do seu horário ${quando}` +
    `${d.servicoNome ? ` (${d.servicoNome})` : ""}.\n\n` +
    `Te espero! 💗\n${d.negocioNome}`
  );
}

export function agradecimentoPosAtendimento(d: DadosDaMensagem): string {
  return (
    `Oi, ${primeiroNome(d.clienteNome)}! Obrigada pela visita de hoje 💗\n\n` +
    `Qualquer coisa é só me chamar por aqui. Já quer deixar o próximo horário marcado?\n` +
    `${d.negocioNome}`
  );
}

/**
 * Reativacao de quem sumiu.
 *
 * Nao menciona quantos dias faz. "Voce nao vem ha 47 dias" soa como cobranca,
 * e a pessoa costuma responder com desculpa - ou nao responder.
 */
export function conviteParaRetorno(d: DadosDaMensagem): string {
  return (
    `Oi, ${primeiroNome(d.clienteNome)}! Tudo bem?\n\n` +
    `Faz um tempinho que você não aparece por aqui e lembrei de você. ` +
    `Quer marcar um horário nesta semana?\n\n` +
    `${d.negocioNome} 💗`
  );
}

export function felizAniversario(d: DadosDaMensagem): string {
  return (
    `Oi, ${primeiroNome(d.clienteNome)}! Passando para desejar um feliz aniversário 🎉\n\n` +
    `Que seu ano seja lindo. Se quiser comemorar com um horário especial, é só me chamar!\n\n` +
    `${d.negocioNome} 💗`
  );
}

export function cobrancaAmigavel(d: DadosDaMensagem): string {
  const valor = d.valor !== undefined ? ` de ${formatCurrency(d.valor)}` : "";
  return (
    `Oi, ${primeiroNome(d.clienteNome)}! Tudo bem?\n\n` +
    `Passando para lembrar do atendimento${valor}` +
    `${d.data ? ` do dia ${formatDateBR(d.data)}` : ""}. ` +
    `Quando puder acertar, me avisa. Obrigada! 💗\n${d.negocioNome}`
  );
}
