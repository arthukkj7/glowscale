import { describe, expect, it } from "vitest";

import {
  DIAS_DE_TESTE,
  NIVEL,
  OFERTAS,
  ORDEM_DAS_OFERTAS,
  economiaAnual,
  limiteDoPlano,
  mensalidadeEquivalente,
  mesesGratisNoAnual,
  planoLibera,
} from "@/lib/planos";
import { PARA_QUEM, VANTAGEM, beneficiosDoNivel } from "@/lib/planos/beneficios";

/**
 * Estes testes guardam o espelho entre este arquivo e as funcoes do banco
 * (limite_do_plano e plano_libera). O banco e quem realmente barra; se os dois
 * divergirem, a tela promete o que o banco recusa.
 */
describe("ofertas", () => {
  it("são três: gratuito, mensal e anual", () => {
    expect(ORDEM_DAS_OFERTAS).toEqual(["free", "pro_mensal", "pro_anual"]);
  });

  it("tem os preços pedidos", () => {
    expect(OFERTAS.free.preco).toBe(0);
    expect(OFERTAS.pro_mensal.preco).toBe(47);
    expect(OFERTAS.pro_anual.preco).toBe(397);
  });

  it("mensal e anual levam ao MESMO nível de acesso", () => {
    // Travar recurso por periodo de cobranca seria arbitrario: o anual e
    // desconto, nao um produto diferente.
    expect(OFERTAS.pro_mensal.nivel).toBe(OFERTAS.pro_anual.nivel);
    expect(beneficiosDoNivel(OFERTAS.pro_mensal.nivel)).toEqual(
      beneficiosDoNivel(OFERTAS.pro_anual.nivel),
    );
  });

  it("o anual é mais barato por mês que o mensal", () => {
    // Se isto falhar, o anual virou punicao em vez de desconto.
    expect(mensalidadeEquivalente("pro_anual")).toBeLessThan(
      mensalidadeEquivalente("pro_mensal"),
    );
  });

  it("a economia anual bate com a conta", () => {
    expect(economiaAnual()).toBe(47 * 12 - 397);
    expect(economiaAnual()).toBe(167);
    expect(mesesGratisNoAnual()).toBe(3);
  });

  it("o teste dura 7 dias", () => {
    expect(DIAS_DE_TESTE).toBe(7);
  });

  it("só as ofertas pagas apontam preço no Stripe", () => {
    expect(OFERTAS.free.variavelDoPreco).toBeUndefined();
    expect(OFERTAS.pro_mensal.variavelDoPreco).toMatch(/^STRIPE_PRICE_/);
    expect(OFERTAS.pro_anual.variavelDoPreco).toMatch(/^STRIPE_PRICE_/);
  });

  it("cada oferta diz para quem é", () => {
    for (const id of ORDEM_DAS_OFERTAS) {
      expect(PARA_QUEM[id].length).toBeGreaterThan(0);
    }
  });

  it("as ofertas pagas dizem qual é a vantagem; a gratuita não precisa", () => {
    expect(VANTAGEM.free).toBeNull();
    expect(VANTAGEM.pro_mensal).toBeTruthy();
    expect(VANTAGEM.pro_anual).toContain("167");
  });
});

describe("níveis de acesso", () => {
  it("Free é de uma profissional e 30 clientes", () => {
    expect(limiteDoPlano("free", "profissionais")).toBe(1);
    expect(limiteDoPlano("free", "clientes")).toBe(30);
  });

  it("Pro é ilimitado", () => {
    expect(limiteDoPlano("pro", "profissionais")).toBeNull();
    expect(limiteDoPlano("pro", "clientes")).toBeNull();
    expect(limiteDoPlano("pro", "usuarios")).toBeNull();
  });

  it("durante o teste tudo está liberado", () => {
    expect(limiteDoPlano("trial", "profissionais")).toBeNull();
    expect(limiteDoPlano("trial", "clientes")).toBeNull();
    expect(planoLibera("trial", "exportar")).toBe(true);
  });

  it("os recursos exclusivos ficam no Pro", () => {
    for (const recurso of ["reativacao", "relatorio_profissional", "exportar"] as const) {
      expect(planoLibera("free", recurso), `free/${recurso}`).toBe(false);
      expect(planoLibera("pro", recurso), `pro/${recurso}`).toBe(true);
    }
  });

  it("o Pro nunca oferece menos que o Free", () => {
    // Um plano pago que trave algo do gratuito seria um bug de produto.
    for (const recurso of ["profissionais", "usuarios", "clientes"] as const) {
      const free = NIVEL.free.limites[recurso];
      const pro = NIVEL.pro.limites[recurso];
      if (pro !== null && free !== null) expect(pro).toBeGreaterThanOrEqual(free);
    }
  });

  it("o Free entrega o essencial, não uma casca", () => {
    // Um gratuito que nao serve para nada nao converte ninguem: ele precisa
    // ser util o bastante para a pessoa criar o habito.
    const linhas = beneficiosDoNivel("free").join(" ");
    expect(linhas).toMatch(/Agenda/);
    expect(linhas).toMatch(/Comissão/);
    expect(linhas).toMatch(/ilimitados/);
  });
});
