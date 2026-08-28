/**
 * Traducao das recusas do Supabase Auth para mensagens acionaveis.
 *
 * Modulo separado de auth.ts de proposito: aquele arquivo e "use server" e so
 * pode exportar funcoes async, o que impediria testar estas funcoes direto.
 */

/** Pagina do painel do Supabase que resolve a recusa. */
export type PaginaDoPainel = "auth/providers" | "auth/rate-limits" | "sql/new" | null;

export interface RecusaDeCadastro {
  mensagem: string;
  /** Onde clicar no painel do Supabase, quando existe um lugar exato. */
  pagina: PaginaDoPainel;
  /** Rotulo do link. */
  rotulo?: string;
}

/**
 * Traduz a recusa do Supabase Auth no cadastro.
 *
 * Diferente do login, aqui nao existe risco de enumeracao de contas a proteger:
 * quase toda falha e de configuracao do projeto Supabase, e esconder o motivo
 * atras de "tente novamente em instantes" deixa quem instalou sem saida - o
 * motivo real fica so no log do servidor, que num deploy exige acesso ao painel.
 *
 * As mensagens do GoTrue sao operacionais ("Signups not allowed for this
 * instance"), nao carregam dado de usuario nem segredo, entao o ultimo caso
 * repassa a original. Sem isso, uma recusa nova volta a ser um beco sem saida.
 */
export function traduzirErroDeCadastro(mensagem: string): RecusaDeCadastro {
  const m = mensagem.toLowerCase();

  if (/already registered|already exists|user already/.test(m)) {
    return {
      mensagem: "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
      pagina: null,
    };
  }

  if (/signups? not allowed|signup is disabled|signups? disabled/.test(m)) {
    return {
      mensagem:
        "O projeto Supabase está com o cadastro de novos usuários desligado. " +
        "Ligue a opção “Allow new users to sign up”.",
      pagina: "auth/providers",
      rotulo: "Abrir as configurações de Email",
    };
  }

  // As duas causas mais comuns numa instalacao nova, e as duas se resolvem no
  // mesmo lugar: sem confirmacao de e-mail, o cadastro para de depender do
  // servico de envio - que no plano gratuito e limitado e falha bastante.
  if (/error sending|sending confirmation|smtp/.test(m)) {
    return {
      mensagem:
        "A conta não foi criada porque o Supabase não conseguiu enviar o e-mail de " +
        "confirmação. O serviço de e-mail embutido é limitado e falha com frequência. " +
        "Desligue “Confirm email” para entrar direto, ou configure um SMTP próprio.",
      pagina: "auth/providers",
      rotulo: "Desligar a confirmação de e-mail",
    };
  }

  if (/rate limit|too many requests|for security purposes/.test(m)) {
    return {
      mensagem:
        "Limite de envio de e-mails do Supabase atingido — o plano gratuito permite " +
        "poucos por hora. Desligue “Confirm email” e o cadastro para de depender de " +
        "e-mail; funciona na hora, sem esperar o limite zerar.",
      pagina: "auth/providers",
      rotulo: "Desligar a confirmação de e-mail",
    };
  }

  if (/database error|saving new user/.test(m)) {
    return {
      mensagem:
        "O Auth criou o usuário mas o banco recusou. Normalmente falta o schema: " +
        "cole supabase/instalar.sql no SQL Editor e rode.",
      pagina: "sql/new",
      rotulo: "Abrir o SQL Editor",
    };
  }

  if (/unable to validate email|invalid email|email address.*invalid/.test(m)) {
    return { mensagem: "O Supabase recusou este e-mail. Tente outro endereço.", pagina: null };
  }

  if (/captcha/.test(m)) {
    return {
      mensagem:
        "O projeto Supabase exige captcha, que este formulário não envia. " +
        "Desligue em Authentication > Settings.",
      pagina: "auth/providers",
      rotulo: "Abrir as configurações de Auth",
    };
  }

  if (/password/.test(m)) {
    return {
      mensagem: "Senha recusada pelo servidor de autenticação. Escolha outra senha.",
      pagina: null,
    };
  }

  return { mensagem: `O Supabase recusou o cadastro: ${mensagem}`, pagina: null };
}
