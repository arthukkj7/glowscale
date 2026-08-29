import { describe, expect, it } from "vitest";

import { linkDoWhatsApp, paraWhatsApp, temWhatsApp } from "@/lib/whatsapp/telefone";
import {
  agradecimentoPosAtendimento,
  confirmacaoDeAgendamento,
  conviteParaRetorno,
  felizAniversario,
} from "@/lib/whatsapp/mensagens";

/**
 * O wa.me exige DDI + DDD + numero, so digitos. Errar aqui abre o aplicativo
 * numa conversa vazia ou no numero errado - e a pessoa so descobre depois de
 * ter mandado a mensagem.
 */
describe("telefone para o WhatsApp", () => {
  it("aceita o que a recepção realmente digita", () => {
    const esperado = "5511999998888";
    for (const entrada of [
      "(11) 99999-8888",
      "11999998888",
      "11 99999 8888",
      "+55 11 99999-8888",
      "5511999998888",
      " (11) 9 9999-8888 ",
    ]) {
      expect(paraWhatsApp(entrada), `falhou em: ${entrada}`).toBe(esperado);
    }
  });

  it("aceita fixo e celular antigo de 8 dígitos", () => {
    expect(paraWhatsApp("(11) 3333-4444")).toBe("551133334444");
  });

  it("não inventa o nono dígito", () => {
    // Um numero que "parece certo" e esta errado e pior que botao ausente.
    expect(paraWhatsApp("1133334444")).toBe("551133334444");
  });

  it("recusa o que não dá para discar", () => {
    for (const ruim of ["", "   ", "abc", "123", "9999", null, undefined]) {
      expect(paraWhatsApp(ruim), `aceitou: ${ruim}`).toBeNull();
      expect(temWhatsApp(ruim)).toBe(false);
    }
  });

  it("monta o link com a mensagem codificada", () => {
    const link = linkDoWhatsApp("(11) 99999-8888", "Oi, Maria! Tudo bem?");
    expect(link).toContain("https://wa.me/5511999998888?text=");
    // Espaco, virgula e acento precisam ir codificados, senao o link quebra.
    expect(link).not.toContain(" ");
    expect(link).toContain("Tudo%20bem");
  });

  it("não monta link quando não há telefone", () => {
    expect(linkDoWhatsApp(null, "oi")).toBeNull();
    expect(linkDoWhatsApp("", "oi")).toBeNull();
  });
});

describe("mensagens sugeridas", () => {
  const base = { clienteNome: "Maria Aparecida da Silva", negocioNome: "Studio Bella" };

  it("chama a pessoa pelo primeiro nome", () => {
    for (const texto of [
      confirmacaoDeAgendamento({ ...base, data: "2026-09-10", hora: "14:00" }),
      conviteParaRetorno(base),
      felizAniversario(base),
      agradecimentoPosAtendimento(base),
    ]) {
      expect(texto).toContain("Maria");
      expect(texto).not.toContain("Aparecida");
    }
  });

  it("assina com o nome do negócio", () => {
    expect(conviteParaRetorno(base)).toContain("Studio Bella");
  });

  it("o convite de retorno não cobra a ausência", () => {
    // "Voce nao vem ha 47 dias" soa como cobranca: a pessoa responde com
    // desculpa, ou nao responde.
    const texto = conviteParaRetorno({ ...base, diasSemVir: 47 });
    expect(texto).not.toMatch(/47|dias sem|não vem há/i);
  });

  it("a confirmação traz data, hora, serviço e profissional", () => {
    const texto = confirmacaoDeAgendamento({
      ...base,
      data: "2026-09-10",
      hora: "14:00",
      servicoNome: "Alongamento",
      profissionalNome: "Ana Beatriz",
    });
    expect(texto).toContain("10/09/2026");
    expect(texto).toContain("14:00");
    expect(texto).toContain("Alongamento");
    expect(texto).toContain("Ana");
    expect(texto).not.toContain("Beatriz");
  });
});
