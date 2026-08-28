import { ZodError, type ZodType } from "zod";

/** Contrato unico de retorno das Server Actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; mensagem?: string }
  | { ok: false; erro: string; camposComErro?: Record<string, string[]> };

export function sucesso<T>(data: T, mensagem?: string): ActionResult<T> {
  return { ok: true, data, mensagem };
}

export function falha(erro: string, camposComErro?: Record<string, string[]>): ActionResult<never> {
  return { ok: false, erro, camposComErro };
}

/** Erro de negocio esperado, seguro para ser exibido ao usuario. */
export class ErroDeNegocio extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErroDeNegocio";
  }
}

const MENSAGEM_GENERICA =
  "Não foi possível concluir a operação. Tente novamente em instantes.";

/** Traduz erros conhecidos do PostgREST para mensagens uteis ao usuario. */
function mensagemDeErroDoBanco(codigo: string | undefined): string | null {
  switch (codigo) {
    case "23505":
      return "Já existe um registro com esses dados.";
    case "23503":
      return "Este registro esta vinculado a outros lançamentos e não pode ser removido.";
    case "23514":
      return "Os dados informados não atendem as regras do sistema.";
    case "42501":
    case "PGRST301":
      return "Você não tem permissão para esta operação.";
    default:
      return null;
  }
}

interface ErroSupabase {
  code?: string;
  message?: string;
}

function ehErroSupabase(erro: unknown): erro is ErroSupabase {
  return typeof erro === "object" && erro !== null && "message" in erro;
}

/**
 * Converte qualquer excecao em ActionResult, registrando o detalhe tecnico no
 * log do servidor e devolvendo ao usuario apenas mensagem segura.
 */
export function tratarErro(contexto: string, erro: unknown): ActionResult<never> {
  if (erro instanceof ZodError) {
    const camposComErro: Record<string, string[]> = {};
    for (const issue of erro.issues) {
      const campo = issue.path.join(".") || "_form";
      camposComErro[campo] = [...(camposComErro[campo] ?? []), issue.message];
    }
    return falha("Revise os campos destacados.", camposComErro);
  }

  if (erro instanceof ErroDeNegocio) {
    return falha(erro.message);
  }

  if (ehErroSupabase(erro)) {
    const mensagem = mensagemDeErroDoBanco(erro.code);
    console.error(`[${contexto}] erro do banco`, {
      code: erro.code,
      message: erro.message,
    });
    return falha(mensagem ?? MENSAGEM_GENERICA);
  }

  console.error(`[${contexto}] erro inesperado`, erro instanceof Error ? erro.message : erro);
  return falha(MENSAGEM_GENERICA);
}

/** Valida a entrada de uma action e lanca ZodError formatado em caso de falha. */
export function validar<T>(schema: ZodType<T>, dados: unknown): T {
  return schema.parse(dados);
}
