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

/**
 * Falta de configuracao nao e erro transitorio: mandar o usuario "tentar de
 * novo em instantes" e mentira, porque tentar de novo nunca vai funcionar.
 * Estes erros ganham mensagem propria, dizendo o que precisa ser feito.
 */
const NOMES_DE_ERRO_DE_CONFIGURACAO = new Set([
  "SupabaseConfigError",
  "AsaasNaoConfiguradoError",
]);

const MENSAGEM_SEM_CONFIGURACAO =
  "O sistema ainda não está conectado ao banco de dados. " +
  "Quem administra esta instalação precisa configurar as variáveis de " +
  "ambiente do Supabase (veja .env.local.example).";

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
    // Schema ausente: o projeto Supabase existe, mas as migrations nunca
    // rodaram. Retentar nao resolve; a mensagem precisa dizer o que fazer.
    case "42883": // função inexistente
    case "42P01": // tabela inexistente
    case "PGRST202":
      return (
        "O banco conectado ainda não tem o schema do GlowScale. " +
        "Cole supabase/instalar.sql no SQL Editor do Supabase e rode."
      );
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

  if (erro instanceof Error && NOMES_DE_ERRO_DE_CONFIGURACAO.has(erro.name)) {
    console.error(`[${contexto}] instalacao incompleta`, erro.message);
    return falha(MENSAGEM_SEM_CONFIGURACAO);
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
