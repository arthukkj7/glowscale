#!/usr/bin/env bash
#
# Gera supabase/instalar.sql concatenando as migrations na ordem.
#
# Quem esta comecando nao quer abrir dois arquivos e lembrar da ordem: quer
# copiar um bloco, colar no SQL Editor e clicar em Run. Este script mantem esse
# arquivo unico em sincronia com as migrations, que continuam sendo a fonte.
#
# Uso:  npm run sql:instalar

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="$RAIZ/supabase/instalar.sql"

cat > "$DESTINO" <<'CABECALHO'
-- =============================================================================
-- GlowScale - instalacao completa do banco
--
-- COMO USAR
--   1. Abra o painel do Supabase > SQL Editor > New query
--   2. Copie este arquivo inteiro, cole na caixa e clique em Run
--   3. Volte ao terminal, rode `npm run doutor` para conferir
--
-- E o conteudo de supabase/migrations/001 e 002 na ordem, num arquivo so.
-- Rodar de novo nao quebra nada: tudo aqui e "if not exists" / "or replace".
--
-- ATENCAO: este arquivo e gerado. Edite as migrations em supabase/migrations/
-- e rode `npm run sql:instalar` para regerar.
-- =============================================================================

CABECALHO

for arquivo in "$RAIZ"/supabase/migrations/*.sql; do
  printf -- '-- >>>>>>>>>>>>>>>>>>>>>>>>>>  %s  <<<<<<<<<<<<<<<<<<<<<<<<<<\n\n' \
    "$(basename "$arquivo")" >> "$DESTINO"
  cat "$arquivo" >> "$DESTINO"
  printf '\n\n' >> "$DESTINO"
done

echo "supabase/instalar.sql gerado ($(wc -l < "$DESTINO") linhas)."
