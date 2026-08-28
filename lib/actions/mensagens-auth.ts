/**
 * Traducao das recusas do Supabase Auth para mensagens acionaveis.
 *
 * Modulo separado de auth.ts de proposito: aquele arquivo e "use server" e so
 * pode exportar funcoes async, o que impediria testar esta funcao diretamente.
 */

/**
 * Traduz a recusa do Supabase Auth no cadastro.
 *
 * Diferente do login, aqui nao existe risco de enumeracao de contas a proteger:
 * quase toda falha e de configuracao do projeto Supabase, e esconder o motivo
 * atras de "tente novamente em instantes" deixa quem instalou sem saida - o
 * motivo real fica so no log do servidor, que na Vercel exige acesso ao painel.
 *
 * As mensagens do GoTrue sao operacionais ("Signups not allowed for this
 * instance"), nao carregam dado de usuario nem segredo, entao a ultima linha
 * repassa a original quando nenhum padrao casa. Sem isso, um caso novo volta a
 * ser um beco sem saida.
 */
export function traduzirErroDeCadastro(mensagem: string): string {
  const m = mensagem.toLowerCase();

  if (/already registered|already exists|user already/.test(m)) {
    return "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.";
  }
  if (/signups? not allowed|signup is disabled|signups? disabled/.test(m)) {
    return (
      "O projeto Supabase está com o cadastro de novos usuários desligado. " +
      "Ligue em Authentication > Sign In / Providers > Email > Allow new users to sign up."
    );
  }
  if (/error sending|sending confirmation|smtp/.test(m)) {
    return (
      "A conta não foi criada porque o Supabase não conseguiu enviar o e-mail de " +
      "confirmação. O servico de e-mail embutido é limitado e falha com frequência. " +
      "Desligue a confirmação em Authentication > Sign In / Providers > Email > " +
      "Confirm email, ou configure um SMTP próprio."
    );
  }
  if (/rate limit|too many requests|for security purposes/.test(m)) {
    return (
      "Limite de tentativas do Supabase atingido - o plano gratuito permite poucos " +
      "e-mails por hora. Espere alguns minutos, ou desligue a confirmação de e-mail " +
      "em Authentication > Sign In / Providers > Email > Confirm email."
    );
  }
  if (/database error|saving new user/.test(m)) {
    return (
      "O Auth criou o usuário mas o banco recusou. Normalmente falta o schema: " +
      "cole supabase/instalar.sql no SQL Editor do Supabase e rode."
    );
  }
  if (/unable to validate email|invalid email|email address.*invalid/.test(m)) {
    return "O Supabase recusou este e-mail. Tente outro endereço.";
  }
  if (/captcha/.test(m)) {
    return "O projeto Supabase exige captcha, que este formulário não envia. Desligue em Authentication > Settings.";
  }
  if (/password/.test(m)) {
    return "Senha recusada pelo servidor de autenticação. Escolha outra senha.";
  }

  // Caso desconhecido: repassar e melhor do que esconder.
  return `O Supabase recusou o cadastro: ${mensagem}`;
}
