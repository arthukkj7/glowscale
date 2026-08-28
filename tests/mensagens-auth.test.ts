import { describe, expect, it } from "vitest";

import { traduzirErroDeCadastro } from "@/lib/actions/mensagens-auth";

/**
 * Estas mensagens sao as strings reais que o GoTrue (Supabase Auth) devolve.
 * O valor delas esta em nomear o ajuste no painel do Supabase: quem instalou
 * precisa saber QUAL botao apertar, nao que "algo deu errado".
 */
describe("traduzirErroDeCadastro", () => {
  it("reconhece cadastro desligado no projeto", () => {
    const m = traduzirErroDeCadastro("Signups not allowed for this instance");
    expect(m).toMatch(/Allow new users to sign up/);
  });

  it("reconhece falha no envio do e-mail de confirmacao", () => {
    for (const bruta of [
      "Error sending confirmation email",
      "error sending confirmation mail",
      "500: SMTP connection failed",
    ]) {
      expect(traduzirErroDeCadastro(bruta)).toMatch(/Confirm email|SMTP/);
    }
  });

  it("reconhece limite de envio, que e o que acontece ao tentar varias vezes", () => {
    for (const bruta of [
      "email rate limit exceeded",
      "Too many requests",
      "For security purposes, you can only request this after 51 seconds",
    ]) {
      expect(traduzirErroDeCadastro(bruta)).toMatch(/[Ll]imite de tentativas/);
    }
  });

  it("aponta o schema ausente quando o Auth grava mas o banco recusa", () => {
    const m = traduzirErroDeCadastro("Database error saving new user");
    expect(m).toMatch(/instalar\.sql/);
  });

  it("mantem a mensagem de conta existente sem revelar mais nada", () => {
    const m = traduzirErroDeCadastro("User already registered");
    expect(m).toBe(
      "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
    );
  });

  it("reconhece captcha e senha recusada", () => {
    expect(traduzirErroDeCadastro("captcha verification process failed")).toMatch(/captcha/i);
    expect(traduzirErroDeCadastro("Password should be at least 6 characters")).toMatch(/[Ss]enha/);
  });

  it("repassa o motivo original quando nao reconhece - nunca um beco sem saida", () => {
    const m = traduzirErroDeCadastro("Something entirely new went wrong");
    expect(m).toContain("Something entirely new went wrong");
  });

  it("nao deixa nenhum caso cair na antiga mensagem generica", () => {
    for (const bruta of [
      "Signups not allowed for this instance",
      "Error sending confirmation email",
      "email rate limit exceeded",
      "Database error saving new user",
      "Unable to validate email address: invalid format",
      "qualquer coisa inesperada",
    ]) {
      expect(traduzirErroDeCadastro(bruta)).not.toMatch(/Tente novamente em instantes/);
    }
  });
});
