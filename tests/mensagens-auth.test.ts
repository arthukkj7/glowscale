import { afterEach, describe, expect, it, vi } from "vitest";

import {
  MENSAGEM_GENERICA_DE_AUTH,
  traduzirErroDeCadastro,
  traduzirErroDeLogin,
} from "@/lib/actions/mensagens-auth";

afterEach(() => vi.unstubAllEnvs());

/**
 * A regra que estes testes guardam: quem USA o GlowScale nunca deve ler o nome
 * de um servico de infraestrutura numa mensagem de erro. As strings abaixo sao
 * as reais devolvidas pelo GoTrue.
 */
const INFRAESTRUTURA = /supabase|postgrest|gotrue|smtp|instalar\.sql|sql editor|env|api key/i;

const RECUSAS_DE_CADASTRO = [
  "Signups not allowed for this instance",
  "Error sending confirmation email",
  "email rate limit exceeded",
  "Database error saving new user",
  "captcha verification process failed",
  "Unable to validate email address: invalid format",
  "User already registered",
  "Password should be at least 6 characters",
  "algo totalmente novo e inesperado",
];

const RECUSAS_DE_LOGIN = [
  "Invalid login credentials",
  "Email not confirmed",
  "For security purposes, you can only request this after 51 seconds",
  "connection refused",
  "algo totalmente novo",
];

describe("mensagens públicas", () => {
  it("nenhuma recusa de cadastro cita infraestrutura", () => {
    for (const bruta of RECUSAS_DE_CADASTRO) {
      const publica = traduzirErroDeCadastro(bruta).publica;
      expect(publica, `vazou em: ${bruta}`).not.toMatch(INFRAESTRUTURA);
    }
  });

  it("nenhuma recusa de login cita infraestrutura", () => {
    for (const bruta of RECUSAS_DE_LOGIN) {
      const publica = traduzirErroDeLogin(bruta).publica;
      expect(publica, `vazou em: ${bruta}`).not.toMatch(INFRAESTRUTURA);
    }
  });

  it("nenhuma mensagem pública repassa o texto cru do servidor", () => {
    const bruta = "connection to server at 10.0.0.1 failed: FATAL password auth";
    expect(traduzirErroDeLogin(bruta).publica).toBe(MENSAGEM_GENERICA_DE_AUTH);
    expect(traduzirErroDeCadastro(bruta).publica).not.toContain("10.0.0.1");
  });

  it("erro desconhecido no login vira 'tente novamente mais tarde'", () => {
    expect(traduzirErroDeLogin("qualquer coisa").publica).toBe(MENSAGEM_GENERICA_DE_AUTH);
  });

  it("senha errada continua dizendo que é a senha", () => {
    // Responder "tente mais tarde" a um erro de digitacao faria a pessoa achar
    // que o sistema caiu e ir embora. Isso nao e falha de infraestrutura.
    expect(traduzirErroDeLogin("Invalid login credentials").publica).toMatch(
      /E-mail ou senha incorretos/,
    );
  });

  it("não revela se o e-mail existe", () => {
    // A mesma mensagem para e-mail inexistente e senha errada evita enumeracao.
    expect(traduzirErroDeLogin("Invalid login credentials").publica).not.toMatch(
      /e-mail não encontrado|não existe|não cadastrado/i,
    );
  });

  it("conta já existente continua explícita no cadastro", () => {
    expect(traduzirErroDeCadastro("User already registered").publica).toMatch(/Já existe/);
  });

  it("limite de tentativas orienta esperar, porque isso resolve mesmo", () => {
    expect(traduzirErroDeCadastro("email rate limit exceeded").publica).toMatch(/Aguarde/);
  });
});

describe("mensagens de diagnóstico", () => {
  it("guardam o motivo real para quem instala", () => {
    const r = traduzirErroDeCadastro("Signups not allowed for this instance");
    expect(r.diagnostico).toMatch(/Allow new users to sign up/);
    expect(r.pagina).toBe("auth/providers");
    // Sem rotulo, o link nao seria renderizado e a pagina viraria letra morta.
    expect(r.rotulo).toBeTruthy();
  });

  it("apontam o SQL Editor quando falta o schema", () => {
    const r = traduzirErroDeCadastro("Database error saving new user");
    expect(r.diagnostico).toMatch(/instalar\.sql/);
    expect(r.pagina).toBe("sql/new");
  });

  it("nunca são iguais à pública quando há algo a diagnosticar", () => {
    const r = traduzirErroDeCadastro("Error sending confirmation email");
    expect(r.diagnostico).not.toBe(r.publica);
  });

  it("não inventam link para o que não se resolve no painel", () => {
    expect(traduzirErroDeCadastro("User already registered").pagina).toBeNull();
    expect(traduzirErroDeLogin("Invalid login credentials").pagina).toBeNull();
  });
});
