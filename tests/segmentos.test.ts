import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { IDS_DE_SEGMENTO, SEGMENTOS, buscarSegmento, ehSegmento } from "@/lib/segmentos";

/**
 * Os templates existem para eliminar o formulario vazio no primeiro acesso.
 * Um template ruim - com serviço duplicado, duração impossível ou preço
 * negativo - seria pior do que nenhum: a pessoa teria de limpar antes de usar.
 */
describe("segmentos", () => {
  it("cobrem os públicos que a vitrine anuncia", () => {
    for (const esperado of ["manicure", "lash", "sobrancelha", "estetica", "cabelo", "barbearia"]) {
      expect(IDS_DE_SEGMENTO, `faltou: ${esperado}`).toContain(esperado);
    }
  });

  it("têm 'outro' para quem não se encaixa, e sem serviços", () => {
    const outro = buscarSegmento("outro");
    expect(outro).not.toBeNull();
    expect(outro?.servicos).toEqual([]);
  });

  it("os ids não se repetem", () => {
    expect(new Set(IDS_DE_SEGMENTO).size).toBe(IDS_DE_SEGMENTO.length);
  });

  it("cada segmento tem nome e descrição", () => {
    for (const s of SEGMENTOS) {
      expect(s.nome.length, s.id).toBeGreaterThan(2);
      expect(s.descricao.length, s.id).toBeGreaterThan(5);
    }
  });

  it("todo segmento (menos 'outro') sugere pelo menos 4 serviços", () => {
    // Menos que isso nao tira a tela do estado vazio, que e o proposito.
    for (const s of SEGMENTOS.filter((s) => s.id !== "outro")) {
      expect(s.servicos.length, s.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("nenhum serviço se repete dentro do segmento", () => {
    for (const s of SEGMENTOS) {
      const nomes = s.servicos.map((x) => x.nome.toLowerCase());
      expect(new Set(nomes).size, s.id).toBe(nomes.length);
    }
  });

  it("os valores e durações passam nas regras do banco", () => {
    // O schema exige valor >= 0 e duracao entre 1 e 1440. Um template que o
    // banco recusa quebraria justamente no primeiro acesso.
    for (const s of SEGMENTOS) {
      for (const servico of s.servicos) {
        expect(servico.valor, `${s.id}/${servico.nome}`).toBeGreaterThan(0);
        expect(servico.duracaoMinutos, `${s.id}/${servico.nome}`).toBeGreaterThanOrEqual(1);
        expect(servico.duracaoMinutos, `${s.id}/${servico.nome}`).toBeLessThanOrEqual(1440);
        // O nome tambem tem check no banco: entre 2 e 120 caracteres.
        expect(servico.nome.trim().length).toBeGreaterThanOrEqual(2);
        expect(servico.nome.trim().length).toBeLessThanOrEqual(120);
      }
    }
  });

  it("reconhece só os segmentos existentes", () => {
    expect(ehSegmento("manicure")).toBe(true);
    expect(ehSegmento("padaria")).toBe(false);
    expect(buscarSegmento(null)).toBeNull();
  });
});

describe("alinhamento com o banco", () => {
  it("os ids batem com o check de clinicas.tipo_negocio", () => {
    // Se as duas listas divergirem, escolher um segmento novo na tela falha no
    // banco com "violates check constraint" - erro que nao explica nada.
    const sql = readFileSync("supabase/migrations/010_metricas_e_oportunidades.sql", "utf-8");
    const bloco = sql.slice(
      sql.indexOf("clinicas_tipo_negocio_valido"),
      sql.indexOf("));", sql.indexOf("clinicas_tipo_negocio_valido")),
    );
    const noBanco = [...bloco.matchAll(/'([a-z]+)'/g)].map((m) => m[1] as string);

    expect(noBanco.length).toBeGreaterThan(5);
    expect([...noBanco].sort()).toEqual([...IDS_DE_SEGMENTO].sort());
  });
});
