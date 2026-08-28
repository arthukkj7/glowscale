#!/usr/bin/env node
/**
 * Diagnostico da instalacao do GlowScale.
 *
 *   npm run doutor
 *
 * Responde, em ordem, as perguntas que travam quem esta comecando:
 * o .env.local existe? as credenciais estao la? o projeto Supabase responde?
 * as migrations rodaram? o banco esta trancado como deveria?
 *
 * Nao escreve nada e nao imprime chave nenhuma - so os primeiros caracteres,
 * o suficiente para conferir que e a chave certa.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const VERDE = "\x1b[32m";
const VERMELHO = "\x1b[31m";
const AMARELO = "\x1b[33m";
const CINZA = "\x1b[90m";
const FIM = "\x1b[0m";

let problemas = 0;
const ok = (m, d) => console.log(`  ${VERDE}[ok]${FIM}    ${m}${d ? `  ${CINZA}${d}${FIM}` : ""}`);
const aviso = (m, d) => console.log(`  ${AMARELO}[--]${FIM}    ${m}${d ? `  ${CINZA}${d}${FIM}` : ""}`);
const erro = (m, comoResolver) => {
  problemas++;
  console.log(`  ${VERMELHO}[X]${FIM}     ${m}`);
  if (comoResolver) console.log(`          ${CINZA}-> ${comoResolver}${FIM}`);
};

/** Mostra so o comeco da chave: da para conferir sem vazar o valor. */
const mascarar = (v) => (v.length <= 12 ? "***" : `${v.slice(0, 12)}...(${v.length} caracteres)`);

// ---------------------------------------------------------------- 1. arquivo
console.log("\nGlowScale - diagnostico da instalacao\n");
console.log("1. Variaveis de ambiente");

const caminhoEnv = resolve(RAIZ, ".env.local");
if (!existsSync(caminhoEnv)) {
  erro(".env.local nao encontrado", "cp .env.local.example .env.local e preencha");
  console.log(`\n${VERMELHO}Sem o .env.local nao da para checar o resto.${FIM}\n`);
  process.exit(1);
}
ok(".env.local encontrado");

const env = {};
for (const linha of readFileSync(caminhoEnv, "utf-8").split("\n")) {
  const limpa = linha.trim();
  if (!limpa || limpa.startsWith("#")) continue;
  const igual = limpa.indexOf("=");
  if (igual === -1) continue;
  env[limpa.slice(0, igual).trim()] = limpa
    .slice(igual + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const chave =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  erro("NEXT_PUBLIC_SUPABASE_URL vazia", "Supabase > Project Settings > API > Project URL");
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  erro(`URL com formato inesperado: ${url}`, "deve ser https://SEU-PROJETO.supabase.co");
} else {
  ok("NEXT_PUBLIC_SUPABASE_URL", url);
}

if (!chave) {
  erro("chave publicavel vazia", "Supabase > Project Settings > API > publishable/anon");
} else {
  ok("chave publicavel", mascarar(chave));
}

if (env.SUPABASE_SERVICE_ROLE_KEY) ok("SUPABASE_SERVICE_ROLE_KEY", mascarar(env.SUPABASE_SERVICE_ROLE_KEY));
else aviso("SUPABASE_SERVICE_ROLE_KEY ausente", "so necessaria para a cobranca Asaas");

if (env.ASAAS_API_KEY) ok("ASAAS_API_KEY", mascarar(env.ASAAS_API_KEY));
else aviso("ASAAS_API_KEY ausente", "checkout fica desabilitado; o painel funciona");

if (!url || !chave) {
  console.log(`\n${VERMELHO}Preencha as credenciais antes de seguir.${FIM}\n`);
  process.exit(1);
}

const base = url.replace(/\/$/, "");
const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}` };

async function pedir(caminho, opcoes = {}) {
  const controlador = new AbortController();
  const t = setTimeout(() => controlador.abort(), 15000);
  try {
    const r = await fetch(base + caminho, {
      ...opcoes,
      headers: { ...cabecalhos, ...(opcoes.headers ?? {}) },
      signal: controlador.signal,
    });
    const texto = await r.text();
    let corpo = null;
    try {
      corpo = JSON.parse(texto);
    } catch {
      corpo = texto;
    }
    return { status: r.status, corpo };
  } catch (e) {
    return { status: 0, corpo: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

// ------------------------------------------------------------ 2. conectividade
console.log("\n2. Conexao com o projeto");
const saude = await pedir("/auth/v1/health");
if (saude.status === 0) {
  erro(`nao foi possivel alcancar ${base}`, `rede/DNS/firewall - detalhe: ${saude.corpo}`);
  console.log(`\n${VERMELHO}Sem conexao, o resto nao pode ser verificado.${FIM}\n`);
  process.exit(1);
}

// Um 2xx generico nao prova nada: proxy corporativo, captive portal e firewall
// tambem respondem. So aceitamos a resposta que o GoTrue do Supabase da.
const ehSupabase =
  saude.status === 200 &&
  typeof saude.corpo === "object" &&
  saude.corpo !== null &&
  typeof saude.corpo.name === "string";

if (ehSupabase) {
  ok("projeto responde", `GoTrue ${saude.corpo.version ?? ""}`.trim());
} else if (saude.status === 401) {
  erro("projeto respondeu 401", "a chave publicavel nao confere com esta URL");
  console.log(`\n${VERMELHO}Corrija as credenciais antes de seguir.${FIM}\n`);
  process.exit(1);
} else {
  erro(
    `resposta inesperada de ${base} (HTTP ${saude.status})`,
    "algo entre voce e o Supabase esta interceptando: proxy, VPN ou firewall. " +
      "Nao da para confiar nas checagens seguintes",
  );
  console.log(`\n${VERMELHO}Resolva a conectividade antes de seguir.${FIM}\n`);
  process.exit(1);
}

// -------------------------------------------------------------- 3. schema
console.log("\n3. Schema do GlowScale");

const TABELAS = ["clinicas", "usuarios", "profissionais", "procedimentos", "atendimentos", "escalas", "assinaturas"];
let faltando = 0;
let expostas = 0;

let indeterminadas = 0;

for (const tabela of TABELAS) {
  const r = await pedir(`/rest/v1/${tabela}?select=id&limit=1`);
  const corpoJson = typeof r.corpo === "object" && r.corpo !== null;
  const codigo = corpoJson ? r.corpo.code : undefined;

  if (r.status === 404 || codigo === "PGRST205") {
    faltando++;
  } else if (r.status === 200 && Array.isArray(r.corpo)) {
    // anon conseguiu ler: a migration nao revogou os privilegios.
    expostas++;
  } else if (corpoJson && (codigo !== undefined || typeof r.corpo.message === "string")) {
    // Erro no formato do PostgREST (tipicamente 42501): a tabela existe e
    // esta trancada, que e exatamente o esperado.
  } else {
    // Resposta que nao veio do PostgREST - nao da para concluir nada.
    indeterminadas++;
  }
}

if (indeterminadas > 0) {
  erro(
    `${indeterminadas} checagem(ns) sem resposta reconhecivel do banco`,
    "as respostas nao vieram do PostgREST; verifique proxy/firewall",
  );
}

if (faltando === TABELAS.length) {
  erro(
    "nenhuma tabela do GlowScale existe no banco",
    "rode supabase/migrations/001_initial_schema.sql e depois 002_funcoes_relatorio.sql no SQL Editor",
  );
} else if (faltando > 0) {
  erro(
    `${faltando} de ${TABELAS.length} tabelas faltando`,
    "a migration 001 rodou pela metade; rode de novo do inicio",
  );
} else {
  ok(`as ${TABELAS.length} tabelas existem`);
}

if (expostas > 0) {
  erro(
    `${expostas} tabela(s) legiveis sem autenticacao`,
    "os GRANT/REVOKE do fim da migration 001 nao foram aplicados - rode o arquivo inteiro",
  );
} else if (faltando === 0) {
  ok("nenhuma tabela exposta ao publico", "RLS e privilegios no lugar");
}

// ------------------------------------------------------------- 4. funcoes
console.log("\n4. Funcoes do banco");
const FUNCOES = [
  ["criar_clinica_com_usuario", { p_clinica_nome: "x", p_usuario_nome: "y" }, "001"],
  ["relatorio_financeiro", { p_data_inicial: "2026-01-01", p_data_final: "2026-01-02" }, "002"],
  ["resumo_financeiro", { p_data_inicial: "2026-01-01", p_data_final: "2026-01-02" }, "002"],
];

for (const [nome, args, migration] of FUNCOES) {
  const r = await pedir(`/rest/v1/rpc/${nome}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const corpoJson = typeof r.corpo === "object" && r.corpo !== null;
  const codigo = corpoJson ? r.corpo.code : undefined;
  if (r.status === 404 || codigo === "PGRST202") {
    erro(`funcao ${nome} nao existe`, `rode a migration ${migration}`);
  } else if (r.status === 200 || (corpoJson && (codigo !== undefined || r.corpo.message))) {
    // Recusar a chamada anonima ja prova que a funcao existe.
    ok(`funcao ${nome} existe`);
  } else {
    erro(`nao foi possivel verificar a funcao ${nome}`, "resposta nao veio do PostgREST");
  }
}

// -------------------------------------------------------------- resultado
console.log("");
if (problemas === 0) {
  console.log(`${VERDE}Tudo pronto.${FIM} Rode ${CINZA}npm run dev${FIM} e crie sua conta em /cadastro.`);
  console.log(
    `${CINZA}Dica: se o cadastro pedir confirmacao de e-mail, desligue em${FIM}\n` +
      `${CINZA}Authentication > Sign In / Providers > Email > Confirm email.${FIM}`,
  );
} else {
  console.log(`${VERMELHO}${problemas} problema(s) encontrado(s).${FIM} Resolva na ordem acima.`);
  console.log(`${CINZA}Passo a passo completo em docs/comecar.md${FIM}`);
}
console.log("");
process.exit(problemas === 0 ? 0 : 1);
