import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Um botao social que devolve erro porque o provedor nao esta configurado
 * custa mais confianca do que a ausencia do botao. Esta funcao e o portao que
 * garante isso, entao ela precisa errar para o lado de nao mostrar nada.
 */
async function habilitados(valor?: string) {
  vi.resetModules();
  if (valor === undefined) vi.stubEnv("NEXT_PUBLIC_OAUTH_PROVIDERS", "");
  else vi.stubEnv("NEXT_PUBLIC_OAUTH_PROVIDERS", valor);
  const { provedoresHabilitados } = await import("@/lib/auth/oauth");
  return provedoresHabilitados();
}

afterEach(() => vi.unstubAllEnvs());

describe("provedoresHabilitados", () => {
  it("não mostra nada quando a variável está vazia", async () => {
    expect(await habilitados()).toEqual([]);
    expect(await habilitados("")).toEqual([]);
  });

  it("aceita um provedor", async () => {
    expect(await habilitados("google")).toEqual(["google"]);
  });

  it("preserva a ordem em que foram listados", async () => {
    expect(await habilitados("apple,google")).toEqual(["apple", "google"]);
  });

  it("tolera espaços e maiúsculas", async () => {
    expect(await habilitados(" Google , APPLE ")).toEqual(["google", "apple"]);
  });

  it("descarta nomes desconhecidos em vez de renderizar um botão sem marca", async () => {
    expect(await habilitados("google,twitter,linkedin")).toEqual(["google"]);
  });

  it("não repete um provedor listado duas vezes", async () => {
    expect(await habilitados("google,google")).toEqual(["google"]);
  });
});
