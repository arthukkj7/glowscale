import { describe, expect, it } from "vitest";

import { normalizarFiltro, queryComFiltros } from "@/lib/utils/filtros";

const HOJE = "2026-03-14";
const UUID = "22222222-2222-4222-8222-000000000001";

describe("normalizarFiltro", () => {
  it("usa o mês corrente como padrão", () => {
    const filtro = normalizarFiltro({}, HOJE);
    expect(filtro.dataInicial).toBe("2026-03-01");
    expect(filtro.dataFinal).toBe("2026-03-31");
    expect(filtro.status).toBe("realizado");
    expect(filtro.profissionalId).toBeNull();
    expect(filtro.temFiltroAtivo).toBe(false);
  });

  it("ignora datas invalidas em vez de quebrar a página", () => {
    const filtro = normalizarFiltro({ dataInicial: "ontem", dataFinal: "x" }, HOJE);
    expect(filtro.dataInicial).toBe("2026-03-01");
    expect(filtro.dataFinal).toBe("2026-03-31");
  });

  it("inverte o intervalo quando vem trocado", () => {
    const filtro = normalizarFiltro(
      { dataInicial: "2026-03-31", dataFinal: "2026-03-01" },
      HOJE,
    );
    expect(filtro.dataInicial).toBe("2026-03-01");
    expect(filtro.dataFinal).toBe("2026-03-31");
  });

  it("so aceita profissionalId com formato de uuid", () => {
    expect(normalizarFiltro({ profissionalId: UUID }, HOJE).profissionalId).toBe(UUID);
    expect(normalizarFiltro({ profissionalId: "todas" }, HOJE).profissionalId).toBeNull();
    expect(
      normalizarFiltro({ profissionalId: "'; drop table atendimentos; --" }, HOJE).profissionalId,
    ).toBeNull();
  });

  it("trata o status 'todos' como ausencia de filtro de status", () => {
    const filtro = normalizarFiltro({ status: "todos" }, HOJE);
    expect(filtro.status).toBeNull();
    expect(filtro.bruto.status).toBe("todos");
    expect(filtro.temFiltroAtivo).toBe(true);
  });

  it("preserva os filtros na query string", () => {
    const filtro = normalizarFiltro({ profissionalId: UUID, status: "cancelado" }, HOJE);
    const query = queryComFiltros(filtro, { pagina: "2" });
    expect(query).toContain(`profissionalId=${UUID}`);
    expect(query).toContain("status=cancelado");
    expect(query).toContain("pagina=2");
  });
});
