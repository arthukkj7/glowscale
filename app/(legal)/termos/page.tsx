import type { Metadata } from "next";
import Link from "next/link";

import { AvisoDeRascunho, IdentificacaoDaEmpresa } from "@/components/marketing/aviso-rascunho";
import { EMPRESA } from "@/lib/constants/empresa";
import { formatCurrency } from "@/lib/calculations/money";
import { DIAS_DE_TESTE, OFERTAS, ORDEM_DAS_OFERTAS, economiaAnual } from "@/lib/planos";
import { formatDateBR } from "@/lib/utils/date";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Condições de uso do GlowScale: assinatura, período de teste, cancelamento.",
  alternates: { canonical: "/termos" },
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="texto-display pt-4 text-xl font-semibold tracking-tight">{children}</h2>
);

export default function TermosPage() {
  return (
    <>
      <h1 className="texto-display text-3xl font-semibold tracking-tight">Termos de Uso</h1>
      <p className="text-muted-foreground">
        Última atualização: {formatDateBR(EMPRESA.atualizadoEm)}
      </p>

      <AvisoDeRascunho />

      <p>
        Ao criar uma conta no GlowScale você concorda com estes termos. Se não concordar, não
        utilize o serviço.
      </p>

      <H2>Quem oferece o serviço</H2>
      <IdentificacaoDaEmpresa />

      <H2>O que o GlowScale faz</H2>
      <p>
        É um sistema pela internet para gestão de negócios de beleza e estética: agenda de
        compromissos, cadastro de clientes e serviços, lançamento de atendimentos, cálculo de
        comissão e relatórios financeiros.
      </p>

      <H2>Sua conta</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        <li>Você precisa ter 18 anos ou mais e fornecer dados verdadeiros.</li>
        <li>A senha é sua responsabilidade. Avise-nos se suspeitar de acesso indevido.</li>
        <li>Cada plano permite um número de logins; compartilhar credenciais para exceder esse número não é permitido.</li>
      </ul>

      <H2>Plano gratuito, teste e cobrança</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        <li>
          O plano <strong>Free</strong> é gratuito por tempo indeterminado, sem cartão, dentro
          dos limites descritos na página inicial.
        </li>
        <li>
          Toda conta nova começa com <strong>{DIAS_DE_TESTE} dias</strong> de acesso ao plano
          Pro, para você experimentar tudo.
        </li>
        <li>
          <strong>Terminado o teste sem assinatura, você não perde o acesso:</strong> a conta
          passa a valer como Free. Nada é apagado — o que exceder os limites gratuitos continua
          guardado, apenas não é possível adicionar mais.
        </li>
        <li>
          Ao assinar o Pro, o cartão é cadastrado e a{" "}
          <strong>primeira cobrança ocorre ao fim do teste</strong>, automaticamente. Se você
          assinar durante o teste, os dias restantes são preservados — o total continua sendo{" "}
          {DIAS_DE_TESTE} dias desde o cadastro.
        </li>
        <li>
          A renovação é automática, mensal ou anual conforme o plano escolhido. Se um pagamento
          falhar, a conta volta ao Free em vez de ser bloqueada.
        </li>
      </ul>

      <H2>Planos e preços</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        {ORDEM_DAS_OFERTAS.map((id) => {
          const oferta = OFERTAS[id];
          return (
            <li key={id}>
              <strong>{oferta.nome}</strong> —{" "}
              {oferta.preco === 0
                ? "gratuito, por tempo indeterminado"
                : `${formatCurrency(oferta.preco)} por ${oferta.periodo === "ano" ? "ano" : "mês"}`}
              .
            </li>
          );
        })}
      </ul>
      <p>
        O plano anual custa {formatCurrency(OFERTAS.pro_anual.preco)} contra{" "}
        {formatCurrency(OFERTAS.pro_mensal.preco * 12)} pagando mês a mês — uma economia de{" "}
        {formatCurrency(economiaAnual())} por ano.
      </p>
      <p>
        Os limites de cada plano estão descritos na{" "}
        <Link href="/#planos" className="text-primary underline-offset-4 hover:underline">
          página de planos
        </Link>
        . Mudanças de preço são avisadas com pelo menos 30 dias de antecedência e valem apenas
        para os ciclos seguintes.
      </p>

      <H2>Cancelamento e reembolso</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        <li>Você pode cancelar quando quiser, pela própria tela de assinatura.</li>
        <li>O cancelamento vale para o fim do período já pago; não há cobrança seguinte.</li>
        <li>
          Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir em até 7 dias
          da contratação e receber de volta o que pagou.
        </li>
        <li>Fora dessa hipótese, não há reembolso de mensalidade já iniciada.</li>
      </ul>

      <H2>Seus dados são seus</H2>
      <p>
        O conteúdo que você cadastra — clientes, agendamentos, serviços, valores — pertence a
        você. Não usamos esses dados para finalidade própria e não os vendemos. O tratamento está
        descrito na{" "}
        <Link href="/privacidade" className="text-primary underline-offset-4 hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>
      <p>
        Ao cadastrar dados de terceiros (suas clientes), você declara ter base legal para isso e
        assume o papel de controlador desses dados perante a LGPD.
      </p>

      <H2>O que não é permitido</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        <li>Usar o sistema para atividade ilícita ou para enviar mensagem não solicitada.</li>
        <li>Tentar acessar dados de outro negócio, ou contornar limites do plano contratado.</li>
        <li>Revender ou sublicenciar o acesso sem autorização por escrito.</li>
      </ul>
      <p>
        Podemos suspender contas que descumpram estes termos, avisando antes sempre que for
        possível.
      </p>

      <H2>Disponibilidade e limites de responsabilidade</H2>
      <p>
        Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento ininterrupto:
        pode haver manutenção, falha de fornecedores ou indisponibilidade fora do nosso controle.
        Nossa responsabilidade, quando houver, fica limitada ao valor pago nos últimos 12 meses.
      </p>
      <p>
        Não respondemos por decisões de negócio tomadas com base nos relatórios do sistema. Confira
        os valores antes de repassar comissões.
      </p>

      <H2>Encerramento</H2>
      <p>
        Você pode encerrar a conta quando quiser. Após o encerramento, mantemos os dados por 30
        dias e depois eliminamos, salvo obrigação legal de retenção. Peça a exportação antes, se
        quiser levá-los.
      </p>

      <H2>Lei aplicável</H2>
      <p>
        Estes termos são regidos pela lei brasileira. Fica eleito o foro do domicílio do
        consumidor para resolver eventuais controvérsias.
      </p>

      <H2>Contato</H2>
      <p>
        Dúvidas sobre estes termos: <strong>{EMPRESA.emailSuporte}</strong>.
      </p>
    </>
  );
}
