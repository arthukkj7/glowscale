import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

/**
 * Caçador de letra cirílica e grega no código.
 *
 * Existe porque isto já aconteceu duas vezes nesta base: um "а" cirílico
 * entrou no meio de um identificador ("convitePараRetorno") e de uma chave de
 * tradução ("sobreМesAnterior"). É invisível na revisão — a letra é idêntica à
 * latina — e quebra de um jeito que não parece erro de digitação: o import não
 * resolve, ou a chave não é encontrada, e ninguém entende por quê.
 *
 * A varredura é sobre o código-fonte. Português usa acento latino, que passa;
 * o que não pode aparecer é alfabeto de outro sistema de escrita.
 */
const ARQUIVOS = execSync(
  "git ls-files 'lib/**/*.ts' 'lib/**/*.tsx' 'components/**/*.tsx' 'app/**/*.tsx' 'app/**/*.ts' 'messages/*.json'",
  { encoding: "utf-8" },
)
  .split("\n")
  .filter(Boolean);

const CIRILICO_OU_GREGO = /[Ͱ-ϿЀ-ӿ]/;

describe("caracteres do código-fonte", () => {
  it("varre um conjunto de arquivos que não está vazio", () => {
    // Sem isto, um glob quebrado faria o teste passar sem olhar nada.
    expect(ARQUIVOS.length).toBeGreaterThan(50);
  });

  it("não tem letra cirílica nem grega em lugar nenhum", () => {
    const encontrados: string[] = [];

    for (const arquivo of ARQUIVOS) {
      const linhas = readFileSync(arquivo, "utf-8").split("\n");
      linhas.forEach((linha, i) => {
        if (CIRILICO_OU_GREGO.test(linha)) {
          encontrados.push(`${arquivo}:${i + 1} → ${linha.trim().slice(0, 80)}`);
        }
      });
    }

    expect(encontrados).toEqual([]);
  });
});
