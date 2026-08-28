import { describe, expect, it } from "vitest";

import {
  DIAS_DE_TESTE,
  ORDEM_DOS_PLANOS,
  PLANOS,
  limiteDoPlano,
  planoLibera,
  planoNecessarioPara,
  planoNecessarioParaQuantidade,
} from "@/lib/planos";

/**
 * Estes testes guardam o espelho entre este arquivo e as funcoes do banco
 * (limite_do_plano e plano_libera). O banco e quem realmente barra; se os dois
 * divergirem, a interface promete o que o banco recusa.
 */
describe("planos", () => {
  it("tem os três preços pedidos, em ordem crescente", () => {
    expect(ORDEM_DOS_PLANOS.map((p) => PLANOS[p].precoMensal)).toEqual([47, 97, 197]);
  });

  it("usa nomes em inglês", () => {
    expect(ORDEM_DOS_PLANOS.map((p) => PLANOS[p].nome)).toEqual(["Solo", "Studio", "Scale"]);
  });

  it("o teste dura 7 dias", () => {
    expect(DIAS_DE_TESTE).toBe(7);
  });

  it("cada plano libera mais que o anterior, nunca menos", () => {
    // Um plano mais caro que trave algo do mais barato seria um bug de produto.
    const recursos = ["reativacao", "relatorio_profissional", "exportar"] as const;
    for (const recurso of recursos) {
      let liberadoAntes = false;
      for (const plano of ORDEM_DOS_PLANOS) {
        const liberado = PLANOS[plano].recursos[recurso];
        if (liberadoAntes) expect(liberado).toBe(true);
        liberadoAntes = liberado;
      }
    }
  });

  it("os limites só crescem ou viram ilimitado", () => {
    const recursos = ["profissionais", "usuarios", "clientes"] as const;
    for (const recurso of recursos) {
      let anterior: number | null = 0;
      for (const plano of ORDEM_DOS_PLANOS) {
        const limite = PLANOS[plano].limites[recurso];
        if (anterior === null) expect(limite).toBeNull();
        else if (limite !== null) expect(limite).toBeGreaterThanOrEqual(anterior);
        anterior = limite;
      }
    }
  });

  it("durante o teste tudo está liberado", () => {
    expect(limiteDoPlano("trial", "profissionais")).toBeNull();
    expect(limiteDoPlano("trial", "clientes")).toBeNull();
    expect(planoLibera("trial", "exportar")).toBe(true);
  });

  it("Solo é de uma profissional só", () => {
    expect(limiteDoPlano("solo", "profissionais")).toBe(1);
    expect(planoLibera("solo", "reativacao")).toBe(false);
  });

  it("Studio comporta equipe pequena", () => {
    expect(limiteDoPlano("studio", "profissionais")).toBe(5);
    expect(planoLibera("studio", "reativacao")).toBe(true);
    expect(planoLibera("studio", "exportar")).toBe(false);
  });

  it("Scale é ilimitado", () => {
    expect(limiteDoPlano("scale", "profissionais")).toBeNull();
    expect(limiteDoPlano("scale", "clientes")).toBeNull();
    expect(planoLibera("scale", "exportar")).toBe(true);
  });

  it("aponta o plano mínimo de cada recurso", () => {
    expect(planoNecessarioPara("reativacao")).toBe("studio");
    expect(planoNecessarioPara("exportar")).toBe("scale");
  });

  it("aponta o plano mínimo para uma quantidade", () => {
    expect(planoNecessarioParaQuantidade("profissionais", 1)).toBe("solo");
    expect(planoNecessarioParaQuantidade("profissionais", 3)).toBe("studio");
    expect(planoNecessarioParaQuantidade("profissionais", 40)).toBe("scale");
    expect(planoNecessarioParaQuantidade("clientes", 100_000)).toBe("studio");
  });

  it("cada plano aponta a variável do preço no Stripe", () => {
    for (const plano of ORDEM_DOS_PLANOS) {
      expect(PLANOS[plano].variavelDoPreco).toMatch(/^STRIPE_PRICE_/);
    }
  });
});
