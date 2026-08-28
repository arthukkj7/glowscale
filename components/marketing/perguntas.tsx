/**
 * Perguntas frequentes.
 *
 * As seis que uma profissional de beleza faz antes de confiar a caderneta de
 * clientes a um sistema novo. Sem elas, a duvida nao desaparece - ela vira
 * "depois eu vejo", que e como a maioria nao volta.
 *
 * Em <details>, nao num acordeao de JavaScript: funciona sem script, e o
 * conteudo fica no HTML para o buscador ler.
 */
const PERGUNTAS = [
  {
    pergunta: "Funciona no celular?",
    resposta:
      "Sim. Todas as telas foram feitas para funcionar no celular, inclusive a agenda do dia " +
      "e o lançamento de atendimento. Não precisa instalar nada: abre no navegador.",
  },
  {
    pergunta: "Preciso cadastrar cartão para testar?",
    resposta:
      "Você usa 7 dias sem compromisso. O cartão só entra quando você escolhe um plano, e a " +
      "primeira cobrança acontece no fim do teste — nunca antes.",
  },
  {
    pergunta: "Posso cancelar quando quiser?",
    resposta:
      "Pode, e sem falar com ninguém. O cancelamento fica na própria tela de assinatura e vale " +
      "para o fim do período já pago.",
  },
  {
    pergunta: "Meus dados ficam seguros?",
    resposta:
      "Cada negócio enxerga apenas os próprios dados, e isso é garantido pelo banco de dados, " +
      "não só pela tela. Nenhum outro salão alcança seus clientes, seus valores ou suas comissões.",
  },
  {
    pergunta: "Trabalho sozinha. Vale a pena?",
    resposta:
      "O plano Solo existe para isso. Você fica com a agenda, a ficha das clientes com histórico " +
      "e o controle do que entrou no mês, sem pagar pelo que só faz sentido com equipe.",
  },
  {
    pergunta: "Já tenho minhas clientes anotadas. Consigo trazer?",
    resposta:
      "Hoje o cadastro é feito pelo sistema, cliente a cliente. A importação de uma lista pronta " +
      "está sendo desenvolvida.",
  },
] as const;

export function Perguntas() {
  return (
    <div className="mx-auto w-full max-w-3xl divide-y divide-border">
      {PERGUNTAS.map(({ pergunta, resposta }) => (
        <details key={pergunta} className="group py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
            {pergunta}
            <span
              aria-hidden="true"
              className="shrink-0 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pt-3 text-sm leading-relaxed text-muted-foreground">{resposta}</p>
        </details>
      ))}
    </div>
  );
}
