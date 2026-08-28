import type { Metadata } from "next";

import { AvisoDeRascunho, IdentificacaoDaEmpresa } from "@/components/marketing/aviso-rascunho";
import { EMPRESA } from "@/lib/constants/empresa";
import { formatDateBR } from "@/lib/utils/date";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o GlowScale trata dados pessoais de quem usa o sistema e das clientes cadastradas.",
  alternates: { canonical: "/privacidade" },
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="texto-display pt-4 text-xl font-semibold tracking-tight">{children}</h2>
);

export default function PrivacidadePage() {
  return (
    <>
      <h1 className="texto-display text-3xl font-semibold tracking-tight">
        Política de Privacidade
      </h1>
      <p className="text-muted-foreground">
        Última atualização: {formatDateBR(EMPRESA.atualizadoEm)}
      </p>

      <AvisoDeRascunho />

      <H2>Quem somos</H2>
      <IdentificacaoDaEmpresa />

      <H2>Dois tipos de dado, dois papéis diferentes</H2>
      <p>
        O GlowScale trata dados pessoais em duas situações distintas, e isso muda quem responde
        por eles:
      </p>
      <ul className="ml-5 list-disc space-y-2">
        <li>
          <strong>Seus dados, de quem assina o GlowScale.</strong> Nome, e-mail, telefone e dados
          de cobrança. Aqui somos <em>controladores</em>: decidimos por que e como tratamos.
        </li>
        <li>
          <strong>Os dados das suas clientes</strong>, que você cadastra no sistema. Aqui somos{" "}
          <em>operadores</em>: tratamos em seu nome e conforme suas instruções. Quem decide o que
          coletar, por quanto tempo guardar e para que usar é você — e é você quem responde por
          isso perante as suas clientes.
        </li>
      </ul>

      <H2>O que coletamos de você</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        <li>Cadastro: nome, e-mail, nome do negócio e, se informado, telefone e cidade.</li>
        <li>Autenticação: e-mail e senha (a senha é guardada com hash, nunca em texto).</li>
        <li>
          Cobrança: processada pelo Stripe. Os dados do cartão não passam pelos nossos servidores
          — recebemos apenas a confirmação do pagamento e os identificadores da assinatura.
        </li>
        <li>Registros técnicos: data e hora de acesso e erros de sistema, para funcionamento e segurança.</li>
      </ul>

      <H2>O que você cadastra sobre suas clientes</H2>
      <p>
        Nome, telefone, e-mail, data de nascimento, observações que você escrever e o histórico de
        atendimentos e valores. Guardamos isso para prestar o serviço a você, e não usamos esses
        dados para nenhuma finalidade própria: não vendemos, não compartilhamos com terceiros e
        não usamos para publicidade.
      </p>

      <H2>Bases legais</H2>
      <ul className="ml-5 list-disc space-y-1.5">
        <li>
          <strong>Execução do contrato</strong> (LGPD, art. 7º, V): para criar sua conta, manter o
          sistema no ar e cobrar a assinatura.
        </li>
        <li>
          <strong>Cumprimento de obrigação legal</strong> (art. 7º, II): guarda de registros de
          acesso e documentos fiscais.
        </li>
        <li>
          <strong>Legítimo interesse</strong> (art. 7º, IX): segurança, prevenção a fraude e
          melhoria do serviço.
        </li>
      </ul>

      <H2>Com quem compartilhamos</H2>
      <p>Apenas com quem é necessário para o sistema funcionar:</p>
      <ul className="ml-5 list-disc space-y-1.5">
        <li><strong>Supabase</strong> — banco de dados e autenticação.</li>
        <li><strong>Vercel</strong> — hospedagem da aplicação.</li>
        <li><strong>Stripe</strong> — processamento de pagamentos.</li>
      </ul>
      <p>
        Esses fornecedores podem manter servidores fora do Brasil. A transferência internacional
        ocorre com base nas garantias previstas no art. 33 da LGPD.
      </p>

      <H2>Por quanto tempo guardamos</H2>
      <p>
        Enquanto sua conta existir. Após o encerramento, mantemos os dados por até 30 dias para
        permitir recuperação em caso de cancelamento por engano, e depois eliminamos — exceto o
        que a lei obrigar a reter, como registros fiscais.
      </p>

      <H2>Seus direitos</H2>
      <p>
        A LGPD (art. 18) garante a você confirmação de tratamento, acesso, correção, anonimização,
        portabilidade, eliminação, informação sobre compartilhamento e revogação de consentimento.
        Para exercer qualquer um deles, escreva para{" "}
        <strong>{EMPRESA.emailPrivacidade}</strong>. Respondemos em até 15 dias.
      </p>
      <p>
        Se o pedido for de uma <em>cliente sua</em> sobre dados que você cadastrou, encaminhe a ela
        o seu próprio canal de atendimento: nesses dados, o controlador é você. Nós apoiamos você
        tecnicamente no que for necessário.
      </p>

      <H2>Segurança</H2>
      <p>
        Cada negócio enxerga apenas os próprios dados, e essa separação é imposta pelo banco de
        dados, não apenas pela interface. O tráfego é cifrado, as senhas passam por hash e o acesso
        administrativo é restrito. Nenhum sistema é imune a incidentes; se houver um que possa
        gerar risco relevante, comunicaremos você e a ANPD conforme o art. 48 da LGPD.
      </p>

      <H2>Mudanças nesta política</H2>
      <p>
        Se mudarmos algo relevante, avisaremos por e-mail ou dentro do sistema antes de a mudança
        valer. A data no topo indica a última revisão.
      </p>
    </>
  );
}
