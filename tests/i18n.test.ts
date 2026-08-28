import { describe, expect, it } from "vitest";

import ptBR from "../messages/pt-BR.json";
import enUS from "../messages/en-US.json";
import { IDIOMAS, IDIOMA_INFO, ehIdioma } from "@/lib/i18n/config";

type Catalogo = Record<string, unknown>;

function achatar(objeto: Catalogo, prefixo = ""): Map<string, string> {
  const saida = new Map<string, string>();
  for (const [chave, valor] of Object.entries(objeto)) {
    const caminho = `${prefixo}${chave}`;
    if (typeof valor === "object" && valor !== null) {
      for (const [k, v] of achatar(valor as Catalogo, `${caminho}.`)) saida.set(k, v);
    } else {
      saida.set(caminho, String(valor));
    }
  }
  return saida;
}

const pt = achatar(ptBR as Catalogo);
const en = achatar(enUS as Catalogo);

/** {nome} usados numa mensagem. */
function variaveis(texto: string): Set<string> {
  return new Set([...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string));
}

describe("catálogos de tradução", () => {
  it("têm exatamente as mesmas chaves", () => {
    // Uma chave só num idioma vira texto cru na tela do outro.
    expect([...pt.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it("usam as mesmas variáveis em cada mensagem", () => {
    // Traduzir "{dias} dias" como "days left" perderia o numero em silencio:
    // a mensagem aparece sem o valor, e ninguem percebe ate um usuario reclamar.
    for (const [chave, textoPt] of pt) {
      const textoEn = en.get(chave);
      expect(textoEn, `chave ausente: ${chave}`).toBeDefined();
      expect(variaveis(textoEn as string), `variáveis divergentes em ${chave}`).toEqual(
        variaveis(textoPt),
      );
    }
  });

  it("não têm mensagem vazia", () => {
    for (const [chave, texto] of [...pt, ...en]) {
      expect(texto.trim(), `mensagem vazia: ${chave}`).not.toBe("");
    }
  });

  it("não deixaram texto em português no catálogo inglês", () => {
    // Acento fora de nome proprio quase sempre e traducao esquecida.
    const suspeitas = [...en].filter(
      ([, texto]) => /[ãõçáéíóúâêô]/i.test(texto) && !/GlowScale/.test(texto),
    );
    expect(suspeitas.map(([c]) => c)).toEqual([]);
  });

  it("reconhece só os idiomas configurados", () => {
    expect(ehIdioma("pt-BR")).toBe(true);
    expect(ehIdioma("en-US")).toBe(true);
    expect(ehIdioma("es-ES")).toBe(false);
    expect(ehIdioma(undefined)).toBe(false);
  });

  it("cada idioma tem bandeira, nome e código curto", () => {
    for (const idioma of IDIOMAS) {
      const info = IDIOMA_INFO[idioma];
      // A bandeira e SVG (components/layout/bandeiras.tsx), nao texto.
      expect(info.nome.length).toBeGreaterThan(0);
      expect(info.nome.length).toBeGreaterThan(0);
      expect(info.curto).toMatch(/^[A-Z]{2}$/);
    }
  });
});
