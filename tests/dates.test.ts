import { describe, expect, it } from "vitest";

import {
  diasDaSemana,
  formatDateBR,
  formatTime,
  formatTurno,
  hojeNaClinica,
  inicioDaSemana,
  isDateOnly,
  primeiroDiaDoMes,
  somarDias,
  ultimoDiaDoMes,
} from "@/lib/utils/date";

describe("datas de negocio", () => {
  it("reconhece o formato yyyy-MM-dd", () => {
    expect(isDateOnly("2026-03-14")).toBe(true);
    expect(isDateOnly("14/03/2026")).toBe(false);
    expect(isDateOnly("2026-13-01")).toBe(false);
  });

  it("formata para o padrao brasileiro sem deslocar o dia", () => {
    // O bug classico e "2026-03-14" virar 13/03 por conversao de fuso.
    expect(formatDateBR("2026-03-14")).toBe("14/03/2026");
    expect(formatDateBR("2026-01-01")).toBe("01/01/2026");
  });

  it("encontra a segunda-feira da semana", () => {
    // 2026-03-14 e um sabado.
    expect(inicioDaSemana("2026-03-14")).toBe("2026-03-09");
    // A propria segunda continua sendo o inicio.
    expect(inicioDaSemana("2026-03-09")).toBe("2026-03-09");
    // Domingo pertence a semana que comecou na segunda anterior.
    expect(inicioDaSemana("2026-03-15")).toBe("2026-03-09");
  });

  it("monta sete dias a partir da segunda", () => {
    const dias = diasDaSemana("2026-03-09");
    expect(dias).toHaveLength(7);
    expect(dias[0]?.data).toBe("2026-03-09");
    expect(dias[0]?.rotuloCurto).toBe("SEG");
    expect(dias[6]?.data).toBe("2026-03-15");
    expect(dias[6]?.rotuloCurto).toBe("DOM");
  });

  it("soma dias atravessando meses", () => {
    expect(somarDias("2026-01-31", 1)).toBe("2026-02-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("calcula limites do mes, inclusive bissexto", () => {
    expect(primeiroDiaDoMes("2026-03-14")).toBe("2026-03-01");
    expect(ultimoDiaDoMes("2026-03-14")).toBe("2026-03-31");
    expect(ultimoDiaDoMes("2024-02-10")).toBe("2024-02-29");
  });

  it("formata horarios do banco", () => {
    expect(formatTime("08:00:00")).toBe("08:00");
    expect(formatTime(null)).toBe("-");
    expect(formatTurno("08:00:00", "18:00:00")).toBe("08:00 - 18:00");
  });

  it("devolve hoje no fuso da clinica", () => {
    expect(isDateOnly(hojeNaClinica("America/Sao_Paulo"))).toBe(true);
  });
});
