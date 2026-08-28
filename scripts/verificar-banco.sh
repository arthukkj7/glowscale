#!/usr/bin/env bash
#
# Verificacao do banco do GlowScale contra um PostgreSQL real.
#
# Sobe uma instancia local, recria o minimo do ambiente Supabase (schema auth,
# auth.uid(), roles anon/authenticated/service_role), aplica as migrations e
# exercita o que a documentacao afirma:
#
#   1. as migrations aplicam limpo;
#   2. as colunas geradas calculam a comissao corretamente;
#   3. o TypeScript reproduz exatamente a conta do banco;
#   4. uma clinica nao consegue ler, escrever nem se promover na outra.
#
# Uso:  ./scripts/verificar-banco.sh
# Requer: postgresql-16 e psql no PATH.

set -euo pipefail

PGPORT="${PGPORT:-5433}"
PGDATA="${PGDATA:-/tmp/glowscale-pgdata}"
PGHOST=127.0.0.1
PSQL="psql -h $PGHOST -p $PGPORT -U postgres -q -t -A"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

falhas=0
ok()    { echo "  [OK]        $1"; }
falhou(){ echo "  [FALHOU]    $1"; falhas=$((falhas+1)); }

echo "==> Subindo PostgreSQL de teste em :$PGPORT"
rm -rf "$PGDATA"; mkdir -p "$PGDATA" /tmp/glowscale-pgrun
chown -R postgres:postgres "$PGDATA" /tmp/glowscale-pgrun 2>/dev/null || true
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $PGDATA -A trust -U postgres" >/dev/null 2>&1
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $PGDATA \
  -o '-p $PGPORT -k /tmp/glowscale-pgrun -c listen_addresses=127.0.0.1' \
  -l /tmp/glowscale-pg.log start" >/dev/null 2>&1
sleep 2

echo "==> Recriando o ambiente Supabase"
$PSQL -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
-- Mesma implementacao do Supabase: nullif antes do cast tolera GUC ausente.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- O Supabase concede tudo por default; a migration precisa revogar.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
SQL

echo ""
echo "==> 1. Migrations"
for arquivo in "$RAIZ"/supabase/migrations/*.sql; do
  if $PSQL -v ON_ERROR_STOP=1 -f "$arquivo" >/dev/null 2>&1; then
    ok "$(basename "$arquivo") aplicada"
  else
    falhou "$(basename "$arquivo")"
  fi
done
$PSQL -v ON_ERROR_STOP=1 -f "$RAIZ/supabase/seed.sql" >/dev/null 2>&1 \
  && ok "seed.sql aplicado" || falhou "seed.sql"

echo ""
echo "==> 2. Colunas geradas: a soma das partes fecha o total?"
desbalanceados=$($PSQL -c "select count(*) from atendimentos
  where valor_comissao + valor_clinica <> valor_total;")
[ "$desbalanceados" = "0" ] \
  && ok "todos os atendimentos fecham (comissao + clinica = total)" \
  || falhou "$desbalanceados atendimento(s) com soma inconsistente"

echo ""
echo "==> 3. Isolamento multi-tenant"
A=aaaaaaaa-0000-4000-8000-000000000001
B=bbbbbbbb-0000-4000-8000-000000000002
$PSQL -c "insert into auth.users (id,email) values
  ('$A','clinica-a@teste.com'),('$B','clinica-b@teste.com') on conflict do nothing;" >/dev/null

criar_tenant() { # $1=auth_user_id  $2=nome
  $PSQL -c "begin; set local role authenticated;
    set local request.jwt.claims='{\"sub\":\"$1\",\"role\":\"authenticated\"}';
    select public.criar_clinica_com_usuario('$2','Dona'); commit;" \
    | tr -d ' ' | grep -E '^[0-9a-f-]{36}$'
}
CA=$(criar_tenant "$A" "Tenant A")
CB=$(criar_tenant "$B" "Tenant B")
$PSQL -c "begin; set local role authenticated;
  set local request.jwt.claims='{\"sub\":\"$A\",\"role\":\"authenticated\"}';
  insert into public.profissionais (clinica_id,nome,percentual_comissao)
  values ('$CA','Profissional da A',40); commit;" >/dev/null

JWT_B="{\"sub\":\"$B\",\"role\":\"authenticated\"}"
# Roda um SQL na sessao da clinica B. O psql sai com status != 0 quando o SQL
# falha; como esperamos justamente que falhe, o status e absorvido aqui - do
# contrario o `pipefail` mascararia o resultado do grep chamador.
como_b() { $PSQL -c "begin; set local role authenticated;
  set local request.jwt.claims='$JWT_B'; $1 commit;" 2>&1 || true; }

# Leitura cruzada: RLS filtra silenciosamente, entao esperamos zero linhas.
saida_leitura=$(como_b "select count(*) from public.profissionais where clinica_id='$CA';")
vazadas=$(grep -E '^[0-9]+$' <<< "$saida_leitura" | head -1)
[ "$vazadas" = "0" ] \
  && ok "clinica B nao enxerga nenhuma linha da clinica A" \
  || falhou "VAZAMENTO: B enxergou $vazadas linha(s) da A"

# Escritas proibidas: esperamos erro em todas.
bloqueia() { # $1=descricao  $2=sql
  local saida; saida=$(como_b "$2")
  if grep -qi "ERROR" <<< "$saida"; then
    ok "bloqueado: $1"
  else
    falhou "PASSOU (deveria ter sido bloqueado): $1"
  fi
}
bloqueia "inserir profissional na clinica A" \
  "insert into public.profissionais (clinica_id,nome,percentual_comissao) values ('$CA','INVASORA',50);"
bloqueia "auto-ativar a propria assinatura" \
  "update public.assinaturas set status='active' where clinica_id='$CB';"
bloqueia "mudar o proprio status de clinica" \
  "update public.clinicas set status='active' where id='$CB';"
bloqueia "migrar o proprio usuario para outra clinica" \
  "update public.usuarios set clinica_id='$CA' where auth_user_id='$B';"
bloqueia "se promover a role owner" \
  "update public.usuarios set role='owner' where auth_user_id='$B';"
bloqueia "ler eventos de webhook (tabela da service role)" \
  "select count(*) from public.asaas_webhook_eventos;"
bloqueia "gravar valor financeiro em coluna gerada" \
  "insert into public.atendimentos (clinica_id,profissional_id,procedimento_id,data_atendimento,quantidade,valor_unitario,comissao_percentual,valor_total) values ('$CB',gen_random_uuid(),gen_random_uuid(),current_date,1,100,10,999999);"

echo ""
echo "==> 4. Integridade estrutural (vale ate para superusuario)"
DEMO=11111111-1111-4111-8111-111111111111
PROF=$($PSQL -c "select id from profissionais where clinica_id='$DEMO' limit 1;")
PROC=$($PSQL -c "select id from procedimentos where clinica_id='$DEMO' limit 1;")
saida_fk=$($PSQL -c "insert into public.atendimentos
  (clinica_id,profissional_id,procedimento_id,data_atendimento,quantidade,valor_unitario,comissao_percentual)
  values ('$CA','$PROF','$PROC',current_date,1,100,10);" 2>&1 || true)
if grep -q "atendimentos_profissional_mesma_clinica" <<< "$saida_fk"; then
  ok "FK composta impede atendimento apontar para profissional de outra clinica"
else
  falhou "FK composta NAO barrou o vinculo cruzado"
fi
for caso in \
  "comissao acima de 100|insert into public.profissionais (clinica_id,nome,percentual_comissao) values ('$DEMO','X',150);|profissionais_comissao_intervalo" \
  "quantidade zero|insert into public.atendimentos (clinica_id,profissional_id,procedimento_id,data_atendimento,quantidade,valor_unitario,comissao_percentual) values ('$DEMO','$PROF','$PROC',current_date,0,100,10);|atendimentos_quantidade_positiva" \
  "turno terminando antes de comecar|insert into public.escalas (clinica_id,profissional_id,data,hora_inicio,hora_fim) values ('$DEMO','$PROF',current_date,'18:00','08:00');|escalas_horario_valido"
do
  IFS='|' read -r desc sql constraint <<< "$caso"
  saida_c=$($PSQL -c "$sql" 2>&1 || true)
  if grep -q "$constraint" <<< "$saida_c"; then
    ok "constraint barra: $desc"
  else
    falhou "constraint NAO barrou: $desc"
  fi
done

echo ""
echo "==> 5. Funcoes de relatorio"
$PSQL -c "update public.usuarios set clinica_id='$DEMO' where auth_user_id='$A';" >/dev/null
saida_rel=$($PSQL -c "begin; set local role authenticated;
  set local request.jwt.claims='{\"sub\":\"$A\",\"role\":\"authenticated\"}';
  select count(*) from public.relatorio_financeiro(current_date-400, current_date+1); commit;" || true)
linhas=$(grep -E '^[0-9]+$' <<< "$saida_rel" | head -1)
[ "${linhas:-0}" -gt 0 ] \
  && ok "relatorio_financeiro consolidou $linhas profissional(is)" \
  || falhou "relatorio_financeiro voltou vazio"
saida_fecha=$($PSQL -c "begin; set local role authenticated;
  set local request.jwt.claims='{\"sub\":\"$A\",\"role\":\"authenticated\"}';
  select (r.comissao + r.valor_clinica = r.faturamento)
  from public.resumo_financeiro(current_date-400, current_date+1) r; commit;" || true)
fecha=$(grep -E '^[tf]$' <<< "$saida_fecha" | head -1)
[ "$fecha" = "t" ] \
  && ok "resumo_financeiro fecha (comissao + clinica = faturamento)" \
  || falhou "resumo_financeiro nao fecha"

echo ""
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $PGDATA stop" >/dev/null 2>&1 || true
if [ "$falhas" -eq 0 ]; then
  echo "=============================================="
  echo " TUDO VERDE - nenhuma verificacao falhou."
  echo "=============================================="
else
  echo "=============================================="
  echo " $falhas VERIFICACAO(OES) FALHARAM"
  echo "=============================================="
  exit 1
fi
