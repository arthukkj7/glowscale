import { describe, expect, it, vi } from "vitest";

import { traduzirErroDeCadastro } from "@/lib/actions/mensagens-auth";

/** Atalho: quase todo teste olha so o texto. */
const traduzir = (bruta: string) => traduzirErroDeCadastro(bruta).mensagem;

/**
 * Estas mensagens sao as strings reais que o GoTrue (Supabase Auth) devolve.
 * O valor delas esta em nomear o ajuste no painel do Supabase: quem instalou
 * precisa saber QUAL botao apertar, nao que "algo deu errado".
 */
describe("traduzirErroDeCadastro", () => {
  it("reconhece cadastro desligado no projeto", () => {
    const m = traduzir("Signups not allowed for this instance");
    expect(m).toMatch(/Allow new users to sign up/);
  });

  it("reconhece falha no envio do e-mail de confirmacao", () => {
    for (const bruta of [
      "Error sending confirmation email",
      "error sending confirmation mail",
      "500: SMTP connection failed",
    ]) {
      expect(traduzir(bruta)).toMatch(/Confirm email|SMTP/);
    }
  });

  it("reconhece limite de envio, que e o que acontece ao tentar varias vezes", () => {
    for (const bruta of [
      "email rate limit exceeded",
      "Too many requests",
      "For security purposes, you can only request this after 51 seconds",
    ]) {
      expect(traduzir(bruta)).toMatch(/[Ll]imite de envio/);
    }
  });

  it("aponta o schema ausente quando o Auth grava mas o banco recusa", () => {
    const m = traduzir("Database error saving new user");
    expect(m).toMatch(/instalar\.sql/);
  });

  it("mantem a mensagem de conta existente sem revelar mais nada", () => {
    const m = traduzir("User already registered");
    expect(m).toBe(
      "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
    );
  });

  it("reconhece captcha e senha recusada", () => {
    expect(traduzir("captcha verification process failed")).toMatch(/captcha/i);
    expect(traduzir("Password should be at least 6 characters")).toMatch(/[Ss]enha/);
  });

  it("repassa o motivo original quando nao reconhece - nunca um beco sem saida", () => {
    const m = traduzir("Something entirely new went wrong");
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
      expect(traduzir(bruta)).not.toMatch(/Tente novamente em instantes/);
    }
  });

  it("aponta a pagina do painel que resolve cada caso", () => {
    const casos: Array<[string, string]> = [
      ["Signups not allowed for this instance", "auth/providers"],
      ["Error sending confirmation email", "auth/providers"],
      ["email rate limit exceeded", "auth/providers"],
      ["Database error saving new user", "sql/new"],
    ];
    for (const [bruta, pagina] of casos) {
      const r = traduzirErroDeCadastro(bruta);
      expect(r.pagina).toBe(pagina);
      // Sem rotulo o link nao seria renderizado, e a pagina viraria letra morta.
      expect(r.rotulo).toBeTruthy();
    }
  });

  it("nao inventa link para o que nao se resolve no painel", () => {
    for (const bruta of [
      "User already registered",
      "Password should be at least 6 characters",
      "algo totalmente novo",
    ]) {
      expect(traduzirErroDeCadastro(bruta).pagina).toBeNull();
    }
  });
});

describe("linkDoPainel", () => {
  it("monta o link a partir da URL publica do projeto", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://torwwuaxoscwemdwowqn.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_xxx");
    const { linkDoPainel } = await import("@/lib/supabase/config");
    expect(linkDoPainel("auth/providers")).toBe(
      "https://supabase.com/dashboard/project/torwwuaxoscwemdwowqn/auth/providers",
    );
    vi.unstubAllEnvs();
  });

  it("nao arrisca um link errado em self-hosted", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.minhaclinica.com.br");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_xxx");
    const { linkDoPainel } = await import("@/lib/supabase/config");
    expect(linkDoPainel("auth/providers")).toBeNull();
    vi.unstubAllEnvs();
  });
});
