import "server-only";

import { requisitarAsaas } from "./client";
import type { ClienteAsaas, ListaAsaas } from "./types";

export interface DadosDoCliente {
  nome: string;
  cpfCnpj: string;
  email?: string | null;
  telefone?: string | null;
  /** id da clinica: permite reencontrar o cliente sem guardar dado sensivel. */
  referenciaExterna: string;
}

/** POST /customers */
export async function criarCliente(dados: DadosDoCliente): Promise<ClienteAsaas> {
  return requisitarAsaas<ClienteAsaas>({
    method: "POST",
    path: "/customers",
    body: {
      name: dados.nome,
      cpfCnpj: dados.cpfCnpj,
      email: dados.email ?? undefined,
      mobilePhone: dados.telefone ?? undefined,
      externalReference: dados.referenciaExterna,
      notificationDisabled: false,
    },
  });
}

/** GET /customers/{id} */
export async function buscarCliente(id: string): Promise<ClienteAsaas> {
  return requisitarAsaas<ClienteAsaas>({ path: `/customers/${encodeURIComponent(id)}` });
}

/** GET /customers?externalReference=... */
export async function buscarClientePorReferencia(
  referenciaExterna: string,
): Promise<ClienteAsaas | null> {
  const lista = await requisitarAsaas<ListaAsaas<ClienteAsaas>>({
    path: "/customers",
    query: { externalReference: referenciaExterna, limit: 1 },
  });
  return lista.data[0] ?? null;
}

/**
 * Reaproveita o cliente ja existente da clinica ou cria um novo.
 * Evita duplicar cadastro no Asaas quando o checkout e refeito.
 */
export async function obterOuCriarCliente(dados: DadosDoCliente): Promise<ClienteAsaas> {
  const existente = await buscarClientePorReferencia(dados.referenciaExterna);
  if (existente) return existente;
  return criarCliente(dados);
}
