/**
 * Mensagens de recusa do login e do cadastro.
 *
 * Duas plateias diferentes, e confundi-las custa caro nas duas pontas:
 *
 *  - quem USA o GlowScale nao tem o que fazer com "o projeto Supabase esta com
 *    o cadastro desligado". Nao e problema dela, ela nao tem acesso ao painel,
 *    e ler o nome de um servico de terceiro no meio de um erro passa a
 *    impressao de sistema mal acabado;
 *  - quem INSTALA precisa exatamente dessa frase, senao fica no escuro.
 *
 * Por isso cada recusa tem duas versoes. A publica e o padrao. A de
 * diagnostico so aparece com GLOWSCALE_DIAGNOSTICO_DE_SETUP=true, e vai para o
 * log do servidor de qualquer jeito.
 *
 * Modulo separado de auth.ts porque aquele arquivo e "use server" e so pode
 * exportar funcoes async - de dentro dele estas funcoes nao teriam como ser
 * testadas.
 */

export type PaginaDoPainel = "auth/providers" | "auth/rate-limits" | "sql/new" | null;

export interface RecusaDeAuth {
  /** Mostrada a quem usa o sistema. Nunca cita infraestrutura. */
  publica: string;
  /** Mostrada a quem instala, quando o diagnostico esta ligado. */
  diagnostico: string;
  /** Onde clicar no painel, quando existe um lugar exato. */
  pagina: PaginaDoPainel;
  rotulo?: string;
}

/** Mensagem padrao: nao promete nada e nao revela nada. */
export const MENSAGEM_GENERICA_DE_AUTH =
  "Não foi possível entrar. Tente novamente mais tarde.";

const MENSAGEM_GENERICA_DE_CADASTRO =
  "Não foi possível criar sua conta. Tente novamente mais tarde.";

/** true quando a instalacao esta em modo de diagnostico. */
export function diagnosticoLigado(): boolean {
  return process.env.GLOWSCALE_DIAGNOSTICO_DE_SETUP?.trim() === "true";
}

/** Escolhe a versao conforme o modo da instalacao. */
export function mensagemParaOUsuario(recusa: RecusaDeAuth): string {
  return diagnosticoLigado() ? recusa.diagnostico : recusa.publica;
}

/**
 * Recusa no LOGIN.
 *
 * Os dois primeiros casos continuam especificos de proposito: quem digitou a
 * senha errada precisa saber que foi a senha. Responder "tente mais tarde" a
 * um erro de digitacao faria a pessoa achar que o sistema caiu e ir embora -
 * o oposto do que se quer proteger.
 *
 * A mensagem de credencial invalida nao distingue e-mail de senha, para nao
 * revelar quais e-mails tem conta (enumeracao).
 */
export function traduzirErroDeLogin(mensagem: string): RecusaDeAuth {
  const m = mensagem.toLowerCase();

  if (/invalid login credentials|invalid credentials/.test(m)) {
    const texto = "E-mail ou senha incorretos.";
    return { publica: texto, diagnostico: texto, pagina: null };
  }
  if (/email not confirmed/.test(m)) {
    const texto = "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
    return { publica: texto, diagnostico: texto, pagina: null };
  }
  if (/rate limit|too many|for security purposes/.test(m)) {
    const texto = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    return { publica: texto, diagnostico: texto, pagina: null };
  }

  // Tudo mais e problema da instalacao, nao de quem esta tentando entrar.
  return {
    publica: MENSAGEM_GENERICA_DE_AUTH,
    diagnostico: `Falha no login: ${mensagem}`,
    pagina: null,
  };
}

/** Recusa no CADASTRO. */
export function traduzirErroDeCadastro(mensagem: string): RecusaDeAuth {
  const m = mensagem.toLowerCase();

  if (/already registered|already exists|user already/.test(m)) {
    const texto = "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.";
    return { publica: texto, diagnostico: texto, pagina: null };
  }
  if (/password/.test(m)) {
    const texto = "Senha recusada. Escolha outra senha.";
    return { publica: texto, diagnostico: texto, pagina: null };
  }
  if (/unable to validate email|invalid email|email address.*invalid/.test(m)) {
    const texto = "Este e-mail não foi aceito. Tente outro endereço.";
    return { publica: texto, diagnostico: texto, pagina: null };
  }

  if (/signups? not allowed|signup is disabled|signups? disabled/.test(m)) {
    return {
      publica: MENSAGEM_GENERICA_DE_CADASTRO,
      diagnostico:
        "O projeto Supabase está com o cadastro de novos usuários desligado. " +
        "Ligue a opção “Allow new users to sign up”.",
      pagina: "auth/providers",
      rotulo: "Abrir as configurações de Email",
    };
  }
  if (/error sending|sending confirmation|smtp/.test(m)) {
    return {
      publica: MENSAGEM_GENERICA_DE_CADASTRO,
      diagnostico:
        "O Supabase não conseguiu enviar o e-mail de confirmação. O serviço embutido " +
        "é limitado e falha com frequência. Desligue “Confirm email” ou configure SMTP próprio.",
      pagina: "auth/providers",
      rotulo: "Desligar a confirmação de e-mail",
    };
  }
  if (/rate limit|too many requests|for security purposes/.test(m)) {
    return {
      // Aqui a pessoa REALMENTE pode tentar mais tarde: o limite zera sozinho.
      publica: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      diagnostico:
        "Limite de envio de e-mails do Supabase atingido. Desligue “Confirm email” " +
        "e o cadastro para de depender de e-mail.",
      pagina: "auth/providers",
      rotulo: "Desligar a confirmação de e-mail",
    };
  }
  if (/database error|saving new user/.test(m)) {
    return {
      publica: MENSAGEM_GENERICA_DE_CADASTRO,
      diagnostico:
        "O Auth criou o usuário mas o banco recusou. Normalmente falta o schema: " +
        "cole supabase/instalar.sql no SQL Editor e rode.",
      pagina: "sql/new",
      rotulo: "Abrir o SQL Editor",
    };
  }
  if (/captcha/.test(m)) {
    return {
      publica: MENSAGEM_GENERICA_DE_CADASTRO,
      diagnostico: "O projeto Supabase exige captcha, que este formulário não envia.",
      pagina: "auth/providers",
      rotulo: "Abrir as configurações de Auth",
    };
  }

  return {
    publica: MENSAGEM_GENERICA_DE_CADASTRO,
    diagnostico: `O Supabase recusou o cadastro: ${mensagem}`,
    pagina: null,
  };
}
