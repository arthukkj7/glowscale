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

-- >>>>>>>>>>>>>>>>>>>>>>>>>>  001_initial_schema.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- GlowScale - Schema inicial
-- SaaS multi-tenant de gestao de escalas, atendimentos e comissoes
-- para clinicas de estetica.
--
-- Modelo de isolamento:
--   auth.users -> usuarios -> clinicas -> (profissionais, procedimentos,
--                                          atendimentos, escalas, assinaturas)
--
-- Toda tabela de negocio carrega clinica_id e possui RLS ativo. As policies
-- comparam o clinica_id do registro com o clinica_id do usuario autenticado,
-- resolvido pela funcao SECURITY DEFINER public.get_user_clinica_id().
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'clinica_status') then
    create type public.clinica_status as enum (
      'trial', 'active', 'past_due', 'canceled', 'blocked'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'usuario_role') then
    -- manager/professional ainda nao sao usados pela aplicacao, mas o dominio
    -- ja esta preparado para receber esses perfis sem migration destrutiva.
    create type public.usuario_role as enum (
      'owner', 'admin', 'manager', 'professional'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'atendimento_status') then
    create type public.atendimento_status as enum ('realizado', 'cancelado');
  end if;

  if not exists (select 1 from pg_type where typname = 'assinatura_status') then
    create type public.assinatura_status as enum (
      'pending', 'trial', 'active', 'past_due', 'canceled', 'expired'
    );
  end if;
end
$$;

-- =============================================================================
-- 2. FUNCOES AUXILIARES
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Trigger BEFORE UPDATE: mantem updated_at sempre coerente no banco.';

-- =============================================================================
-- 3. TABELAS
-- =============================================================================

-- ---------------------------------------------------------------- clinicas --
create table if not exists public.clinicas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  nome_fantasia text,
  documento     text,
  email         citext,
  telefone      text,
  cidade        text,
  estado        char(2),
  timezone      text not null default 'America/Sao_Paulo',
  status        public.clinica_status not null default 'trial',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint clinicas_nome_nao_vazio check (length(btrim(nome)) between 2 and 120),
  constraint clinicas_nome_fantasia_tamanho check (
    nome_fantasia is null or length(btrim(nome_fantasia)) <= 120
  ),
  constraint clinicas_documento_tamanho check (
    documento is null or length(regexp_replace(documento, '\D', '', 'g')) in (11, 14)
  ),
  constraint clinicas_estado_uf check (estado is null or estado ~ '^[A-Z]{2}$'),
  constraint clinicas_timezone_valida check (length(btrim(timezone)) > 0)
);

comment on table public.clinicas is 'Tenant raiz. Todo dado de negocio pertence a exatamente uma clinica.';

-- ---------------------------------------------------------------- usuarios --
create table if not exists public.usuarios (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  clinica_id   uuid not null references public.clinicas (id) on delete cascade,
  nome         text not null,
  email        citext not null,
  role         public.usuario_role not null default 'owner',
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint usuarios_nome_nao_vazio check (length(btrim(nome)) between 2 and 120)
);

comment on table public.usuarios is
  'Perfil de aplicacao ligado a auth.users. Define a qual clinica o usuario pertence.';

-- ----------------------------------------------------------- profissionais --
create table if not exists public.profissionais (
  id                  uuid primary key default gen_random_uuid(),
  clinica_id          uuid not null references public.clinicas (id) on delete cascade,
  nome                text not null,
  email               citext,
  telefone            text,
  especialidade       text,
  percentual_comissao numeric(5, 2) not null default 0,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint profissionais_nome_nao_vazio check (length(btrim(nome)) between 2 and 120),
  constraint profissionais_comissao_intervalo check (
    percentual_comissao >= 0 and percentual_comissao <= 100
  ),
  -- Permite FK composta a partir de atendimentos/escalas, garantindo no banco
  -- que um atendimento nunca aponte para profissional de outra clinica.
  constraint profissionais_id_clinica_unico unique (id, clinica_id)
);

-- ----------------------------------------------------------- procedimentos --
create table if not exists public.procedimentos (
  id               uuid primary key default gen_random_uuid(),
  clinica_id       uuid not null references public.clinicas (id) on delete cascade,
  nome             text not null,
  descricao        text,
  valor            numeric(12, 2) not null default 0,
  duracao_minutos  integer not null default 60,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint procedimentos_nome_nao_vazio check (length(btrim(nome)) between 2 and 120),
  constraint procedimentos_valor_positivo check (valor >= 0),
  constraint procedimentos_duracao_valida check (duracao_minutos between 1 and 1440),
  constraint procedimentos_id_clinica_unico unique (id, clinica_id)
);

-- ------------------------------------------------------------ atendimentos --
-- valor_total, valor_comissao e valor_clinica sao colunas GERADAS pelo banco.
-- Isso torna impossivel gravar um atendimento com matematica financeira
-- inconsistente, mesmo que a chamada venha direto do PostgREST.
create table if not exists public.atendimentos (
  id                  uuid primary key default gen_random_uuid(),
  clinica_id          uuid not null references public.clinicas (id) on delete cascade,
  profissional_id     uuid not null,
  procedimento_id     uuid not null,
  data_atendimento    date not null,
  quantidade          integer not null default 1,
  valor_unitario      numeric(12, 2) not null,
  -- snapshot do percentual vigente no momento do lancamento
  comissao_percentual numeric(5, 2) not null,
  valor_total         numeric(12, 2)
                        generated always as (round(valor_unitario * quantidade, 2)) stored,
  valor_comissao      numeric(12, 2)
                        generated always as (
                          round(round(valor_unitario * quantidade, 2) * comissao_percentual / 100, 2)
                        ) stored,
  valor_clinica       numeric(12, 2)
                        generated always as (
                          round(valor_unitario * quantidade, 2)
                          - round(round(valor_unitario * quantidade, 2) * comissao_percentual / 100, 2)
                        ) stored,
  status              public.atendimento_status not null default 'realizado',
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint atendimentos_quantidade_positiva check (quantidade > 0 and quantidade <= 1000),
  constraint atendimentos_valor_unitario_positivo check (valor_unitario >= 0),
  constraint atendimentos_comissao_intervalo check (
    comissao_percentual >= 0 and comissao_percentual <= 100
  ),
  constraint atendimentos_observacoes_tamanho check (
    observacoes is null or length(observacoes) <= 1000
  ),
  constraint atendimentos_data_plausivel check (
    data_atendimento >= date '2000-01-01' and data_atendimento <= current_date + 365
  ),
  constraint atendimentos_profissional_mesma_clinica
    foreign key (profissional_id, clinica_id)
    references public.profissionais (id, clinica_id) on delete restrict,
  constraint atendimentos_procedimento_mesma_clinica
    foreign key (procedimento_id, clinica_id)
    references public.procedimentos (id, clinica_id) on delete restrict
);

comment on column public.atendimentos.comissao_percentual is
  'Snapshot imutavel do percentual da profissional no momento do lancamento. Alterar o cadastro da profissional nao reescreve atendimentos antigos.';

-- ------------------------------------------------------------------ escalas --
create table if not exists public.escalas (
  id              uuid primary key default gen_random_uuid(),
  clinica_id      uuid not null references public.clinicas (id) on delete cascade,
  profissional_id uuid not null,
  data            date not null,
  hora_inicio     time not null,
  hora_fim        time not null,
  observacoes     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint escalas_horario_valido check (hora_inicio < hora_fim),
  constraint escalas_observacoes_tamanho check (
    observacoes is null or length(observacoes) <= 500
  ),
  constraint escalas_data_plausivel check (
    data >= date '2000-01-01' and data <= current_date + 730
  ),
  constraint escalas_profissional_mesma_clinica
    foreign key (profissional_id, clinica_id)
    references public.profissionais (id, clinica_id) on delete cascade,
  -- evita duplicar exatamente o mesmo turno
  constraint escalas_turno_unico unique (profissional_id, data, hora_inicio, hora_fim)
);

-- -------------------------------------------------------------- assinaturas --
create table if not exists public.assinaturas (
  id                    uuid primary key default gen_random_uuid(),
  clinica_id            uuid not null references public.clinicas (id) on delete cascade,
  asaas_customer_id     text,
  asaas_subscription_id text unique,
  status                public.assinatura_status not null default 'pending',
  plano                 text not null default 'essencial',
  valor                 numeric(12, 2) not null default 0,
  ciclo                 text not null default 'MONTHLY',
  forma_pagamento       text not null default 'UNDEFINED',
  url_pagamento         text,
  data_inicio           date,
  data_fim              date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint assinaturas_valor_positivo check (valor >= 0),
  constraint assinaturas_periodo_valido check (
    data_fim is null or data_inicio is null or data_fim >= data_inicio
  ),
  constraint assinaturas_clinica_unica unique (clinica_id)
);

comment on table public.assinaturas is
  'Espelho local da assinatura Asaas. Escrita exclusiva do servidor (service role).';

-- --------------------------------------------------- asaas_webhook_eventos --
-- Registro de idempotencia: o mesmo event id do Asaas nunca e processado duas vezes.
create table if not exists public.asaas_webhook_eventos (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null unique,
  event_type   text not null,
  payload      jsonb not null,
  processado_em timestamptz not null default now()
);

-- =============================================================================
-- 4. INDICES
-- =============================================================================

create index if not exists idx_usuarios_clinica on public.usuarios (clinica_id);
create index if not exists idx_usuarios_email on public.usuarios (email);

create index if not exists idx_profissionais_clinica_ativo
  on public.profissionais (clinica_id, ativo);
create index if not exists idx_profissionais_clinica_nome
  on public.profissionais (clinica_id, nome);

create index if not exists idx_procedimentos_clinica_ativo
  on public.procedimentos (clinica_id, ativo);
create index if not exists idx_procedimentos_clinica_nome
  on public.procedimentos (clinica_id, nome);

create index if not exists idx_atendimentos_clinica_data
  on public.atendimentos (clinica_id, data_atendimento desc);
create index if not exists idx_atendimentos_clinica_profissional_data
  on public.atendimentos (clinica_id, profissional_id, data_atendimento desc);
create index if not exists idx_atendimentos_clinica_status_data
  on public.atendimentos (clinica_id, status, data_atendimento desc);
create index if not exists idx_atendimentos_procedimento
  on public.atendimentos (procedimento_id);

create index if not exists idx_escalas_clinica_data
  on public.escalas (clinica_id, data);
create index if not exists idx_escalas_profissional_data
  on public.escalas (profissional_id, data);

create index if not exists idx_assinaturas_clinica on public.assinaturas (clinica_id);
create index if not exists idx_assinaturas_customer on public.assinaturas (asaas_customer_id);

-- =============================================================================
-- 5. TRIGGERS updated_at
-- =============================================================================

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'clinicas', 'usuarios', 'profissionais', 'procedimentos',
    'atendimentos', 'escalas', 'assinaturas'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated_at on public.%1$s;', tabela
    );
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.set_updated_at();', tabela
    );
  end loop;
end
$$;

-- =============================================================================
-- 6. FUNCOES DE CONTEXTO DO TENANT
--
-- SECURITY DEFINER porque a propria funcao precisa ler public.usuarios sem
-- disparar a policy que a chama (evita recursao infinita em RLS).
-- search_path fixo evita sequestro de resolucao de nomes.
-- =============================================================================

create or replace function public.get_user_clinica_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.clinica_id
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
    and u.ativo = true
  limit 1;
$$;

comment on function public.get_user_clinica_id() is
  'Retorna o clinica_id do usuario autenticado. Base de todas as policies RLS.';

create or replace function public.get_user_role()
returns public.usuario_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.role
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
    and u.ativo = true
  limit 1;
$$;

revoke all on function public.get_user_clinica_id() from public;
revoke all on function public.get_user_role() from public;
grant execute on function public.get_user_clinica_id() to authenticated, service_role;
grant execute on function public.get_user_role() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Onboarding transacional: cria clinica + perfil do usuario autenticado.
-- Evita precisar da service role key no fluxo de cadastro e garante que um
-- mesmo auth user nunca crie duas clinicas.
-- ---------------------------------------------------------------------------
create or replace function public.criar_clinica_com_usuario(
  p_clinica_nome text,
  p_usuario_nome text,
  p_telefone text default null,
  p_cidade text default null,
  p_estado text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_auth_user_id uuid := (select auth.uid());
  v_email text;
  v_clinica_id uuid;
begin
  if v_auth_user_id is null then
    raise exception 'nao autenticado' using errcode = '28000';
  end if;

  select clinica_id into v_clinica_id
  from public.usuarios
  where auth_user_id = v_auth_user_id;

  if v_clinica_id is not null then
    return v_clinica_id;
  end if;

  select email into v_email from auth.users where id = v_auth_user_id;

  insert into public.clinicas (nome, nome_fantasia, email, telefone, cidade, estado, status)
  values (
    btrim(p_clinica_nome),
    btrim(p_clinica_nome),
    v_email,
    nullif(btrim(coalesce(p_telefone, '')), ''),
    nullif(btrim(coalesce(p_cidade, '')), ''),
    nullif(upper(btrim(coalesce(p_estado, ''))), ''),
    'trial'
  )
  returning id into v_clinica_id;

  insert into public.usuarios (auth_user_id, clinica_id, nome, email, role)
  values (v_auth_user_id, v_clinica_id, btrim(p_usuario_nome), v_email, 'owner');

  insert into public.assinaturas (clinica_id, status, plano, valor)
  values (v_clinica_id, 'pending', 'essencial', 0)
  on conflict (clinica_id) do nothing;

  return v_clinica_id;
end;
$$;

revoke all on function public.criar_clinica_com_usuario(text, text, text, text, text) from public;
grant execute on function public.criar_clinica_com_usuario(text, text, text, text, text)
  to authenticated;

-- =============================================================================
-- 7. RLS
-- =============================================================================

alter table public.clinicas              enable row level security;
alter table public.usuarios              enable row level security;
alter table public.profissionais         enable row level security;
alter table public.procedimentos         enable row level security;
alter table public.atendimentos          enable row level security;
alter table public.escalas               enable row level security;
alter table public.assinaturas           enable row level security;
alter table public.asaas_webhook_eventos enable row level security;

-- ------------------------------------------------------------------ grants --
-- O Supabase concede privilegios amplos por default privileges. Aqui o acesso
-- e reduzido ao minimo necessario, inclusive no nivel de coluna.
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'clinicas', 'usuarios', 'profissionais', 'procedimentos',
    'atendimentos', 'escalas', 'assinaturas', 'asaas_webhook_eventos'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated;', tabela);
  end loop;
end
$$;

grant select                         on public.clinicas      to authenticated;
-- status nunca pode ser alterado pelo navegador: so colunas de cadastro.
grant update (nome, nome_fantasia, documento, email, telefone, cidade, estado)
                                     on public.clinicas      to authenticated;

grant select                         on public.usuarios      to authenticated;
grant update (nome)                  on public.usuarios      to authenticated;

grant select, insert, update, delete on public.profissionais to authenticated;
grant select, insert, update, delete on public.procedimentos to authenticated;
grant select, insert, update, delete on public.atendimentos  to authenticated;
grant select, insert, update, delete on public.escalas       to authenticated;
-- assinaturas: leitura pelo tenant, escrita apenas server-side (service_role).
grant select                         on public.assinaturas   to authenticated;

-- ---------------------------------------------------------------- clinicas --
drop policy if exists clinicas_select_propria on public.clinicas;
create policy clinicas_select_propria on public.clinicas
  for select to authenticated
  using (id = (select public.get_user_clinica_id()));

drop policy if exists clinicas_update_propria on public.clinicas;
create policy clinicas_update_propria on public.clinicas
  for update to authenticated
  using (
    id = (select public.get_user_clinica_id())
    and (select public.get_user_role()) in ('owner', 'admin')
  )
  with check (id = (select public.get_user_clinica_id()));

-- ---------------------------------------------------------------- usuarios --
drop policy if exists usuarios_select_mesma_clinica on public.usuarios;
create policy usuarios_select_mesma_clinica on public.usuarios
  for select to authenticated
  using (clinica_id = (select public.get_user_clinica_id()));

drop policy if exists usuarios_update_proprio on public.usuarios;
create policy usuarios_update_proprio on public.usuarios
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- ---------------------------------------- tabelas de negocio por clinica_id --
do $$
declare
  tabela text;
begin
  foreach tabela in array array['profissionais', 'procedimentos', 'atendimentos', 'escalas']
  loop
    execute format('drop policy if exists %1$s_select on public.%1$s;', tabela);
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated
         using (clinica_id = (select public.get_user_clinica_id()));', tabela
    );

    execute format('drop policy if exists %1$s_insert on public.%1$s;', tabela);
    execute format(
      'create policy %1$s_insert on public.%1$s for insert to authenticated
         with check (clinica_id = (select public.get_user_clinica_id()));', tabela
    );

    execute format('drop policy if exists %1$s_update on public.%1$s;', tabela);
    execute format(
      'create policy %1$s_update on public.%1$s for update to authenticated
         using (clinica_id = (select public.get_user_clinica_id()))
         with check (clinica_id = (select public.get_user_clinica_id()));', tabela
    );

    execute format('drop policy if exists %1$s_delete on public.%1$s;', tabela);
    execute format(
      'create policy %1$s_delete on public.%1$s for delete to authenticated
         using (clinica_id = (select public.get_user_clinica_id()));', tabela
    );
  end loop;
end
$$;

-- ------------------------------------------------------------- assinaturas --
drop policy if exists assinaturas_select_propria on public.assinaturas;
create policy assinaturas_select_propria on public.assinaturas
  for select to authenticated
  using (clinica_id = (select public.get_user_clinica_id()));

-- Sem policies de INSERT/UPDATE/DELETE para authenticated: apenas o servidor
-- (service_role, que ignora RLS) altera status de assinatura. Isso impede que
-- um cliente PostgREST se auto-promova para status 'active'.

-- ---------------------------------------------------- asaas_webhook_eventos --
-- Nenhuma policy e nenhum grant: tabela exclusiva da service_role.

-- =============================================================================
-- 8. REALTIME / EXPOSICAO
-- =============================================================================
-- Nada exposto para o papel anon: usuarios nao autenticados nao leem negocio.


-- >>>>>>>>>>>>>>>>>>>>>>>>>>  002_funcoes_relatorio.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- GlowScale - Funcoes de relatorio
--
-- A consolidacao financeira acontece no banco, nao no navegador: os filtros
-- viram WHERE e o agrupamento vira GROUP BY. Assim uma clinica com dezenas de
-- milhares de atendimentos continua respondendo rapido e o cliente recebe
-- apenas as linhas agregadas.
--
-- SECURITY INVOKER (padrao): as policies RLS de atendimentos continuam
-- valendo, entao a funcao so enxerga a clinica do usuario autenticado.
-- =============================================================================

create or replace function public.relatorio_financeiro(
  p_data_inicial date,
  p_data_final date,
  p_profissional_id uuid default null,
  p_status public.atendimento_status default 'realizado'
)
returns table (
  profissional_id uuid,
  profissional_nome text,
  quantidade bigint,
  faturamento numeric,
  comissao numeric,
  valor_clinica numeric,
  comissao_percentual_media numeric
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    p.id as profissional_id,
    p.nome as profissional_nome,
    count(a.id) as quantidade,
    coalesce(sum(a.valor_total), 0)::numeric(14, 2) as faturamento,
    coalesce(sum(a.valor_comissao), 0)::numeric(14, 2) as comissao,
    coalesce(sum(a.valor_clinica), 0)::numeric(14, 2) as valor_clinica,
    case
      when coalesce(sum(a.valor_total), 0) = 0 then 0
      else round(sum(a.valor_comissao) * 100 / sum(a.valor_total), 2)
    end as comissao_percentual_media
  from public.atendimentos a
  join public.profissionais p
    on p.id = a.profissional_id
   and p.clinica_id = a.clinica_id
  where a.clinica_id = (select public.get_user_clinica_id())
    and a.data_atendimento between p_data_inicial and p_data_final
    and (p_profissional_id is null or a.profissional_id = p_profissional_id)
    and (p_status is null or a.status = p_status)
  group by p.id, p.nome
  order by faturamento desc, p.nome asc;
$$;

comment on function public.relatorio_financeiro(date, date, uuid, public.atendimento_status) is
  'Consolidacao de faturamento, comissao e repasse por profissional dentro do periodo.';

create or replace function public.resumo_financeiro(
  p_data_inicial date,
  p_data_final date,
  p_profissional_id uuid default null,
  p_status public.atendimento_status default 'realizado'
)
returns table (
  quantidade bigint,
  faturamento numeric,
  comissao numeric,
  valor_clinica numeric
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    count(a.id) as quantidade,
    coalesce(sum(a.valor_total), 0)::numeric(14, 2) as faturamento,
    coalesce(sum(a.valor_comissao), 0)::numeric(14, 2) as comissao,
    coalesce(sum(a.valor_clinica), 0)::numeric(14, 2) as valor_clinica
  from public.atendimentos a
  where a.clinica_id = (select public.get_user_clinica_id())
    and a.data_atendimento between p_data_inicial and p_data_final
    and (p_profissional_id is null or a.profissional_id = p_profissional_id)
    and (p_status is null or a.status = p_status);
$$;

comment on function public.resumo_financeiro(date, date, uuid, public.atendimento_status) is
  'Totais consolidados do periodo, usados nos cards do dashboard e do financeiro.';

revoke all on function
  public.relatorio_financeiro(date, date, uuid, public.atendimento_status) from public;
revoke all on function
  public.resumo_financeiro(date, date, uuid, public.atendimento_status) from public;

grant execute on function
  public.relatorio_financeiro(date, date, uuid, public.atendimento_status) to authenticated;
grant execute on function
  public.resumo_financeiro(date, date, uuid, public.atendimento_status) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>  003_stripe.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- GlowScale - cobranca via Stripe
--
-- A tabela `assinaturas` nasceu presa ao Asaas: os identificadores do provedor
-- eram colunas com nome proprio (asaas_customer_id, asaas_subscription_id).
-- Esta migration acrescenta o Stripe ao lado, sem remover nada:
--
--   * a coluna `provedor` diz quem cobra aquela clinica;
--   * os identificadores do Stripe ganham colunas proprias, em vez de dividir
--     as do Asaas - um id trocado entre provedores e o tipo de bug que so
--     aparece em producao, com dinheiro no meio;
--   * os eventos de webhook do Stripe tem tabela propria, pelo mesmo motivo
--     que os do Asaas tem: o unique em event_id e o que garante idempotencia,
--     e misturar os dois namespaces criaria colisao entre provedores.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

-- ------------------------------------------------------------------ colunas
alter table public.assinaturas
  add column if not exists provedor               text not null default 'asaas',
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assinaturas_provedor_valido'
  ) then
    alter table public.assinaturas
      add constraint assinaturas_provedor_valido
      check (provedor in ('asaas', 'stripe'));
  end if;
end $$;

-- Um assinante do Stripe nao pode aparecer em duas clinicas.
create unique index if not exists idx_assinaturas_stripe_subscription
  on public.assinaturas (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists idx_assinaturas_stripe_customer
  on public.assinaturas (stripe_customer_id)
  where stripe_customer_id is not null;

-- ------------------------------------------------------- eventos de webhook
create table if not exists public.stripe_webhook_eventos (
  id            uuid primary key default gen_random_uuid(),
  event_id      text not null unique,
  event_type    text not null,
  payload       jsonb not null,
  processado_em timestamptz not null default now()
);

alter table public.stripe_webhook_eventos enable row level security;

-- Mesma postura da tabela do Asaas: ninguem alcanca isto pelo PostgREST.
-- Sem policy e sem grant, so a service role (que ignora RLS) enxerga a tabela.
revoke all on public.stripe_webhook_eventos from anon, authenticated;

-- ------------------------------------------------------------------ grants
-- `assinaturas` continua somente-leitura para o usuario autenticado: quem
-- muda status de assinatura e o webhook, com service role. Sem isto, uma
-- clinica poderia se marcar como 'active' pelo PostgREST e usar de graca.
revoke insert, update, delete on public.assinaturas from anon, authenticated;
grant select on public.assinaturas to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>  004_clientes.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- GlowScale - Clientes (CRM)
--
-- Ate aqui o sistema sabia QUANTO cada profissional faturou, mas nao PARA QUEM.
-- Sem isso nao existe historico, ticket medio, cliente que sumiu nem agenda -
-- agendar e reservar um horario para alguem.
--
-- O vinculo em atendimentos e opcional de proposito: atendimento de balcao
-- existe, e obrigar um cadastro para lancar a comissao criaria cliente
-- fantasma so para o formulario fechar.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

-- --------------------------------------------------------------- utilitario
-- Remove acentos para a busca por nome.
--
-- Feito com translate() em vez da extensao unaccent de proposito: unaccent()
-- e STABLE, entao nao pode entrar num indice, e o wrapper IMMUTABLE que se
-- costuma escrever depende do schema onde a extensao foi instalada - que
-- difere entre o Supabase (extensions) e um Postgres comum (public). translate
-- e IMMUTABLE, nao precisa de extensao nenhuma e cobre o portugues.
create or replace function public.sem_acento(texto text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select translate(
    texto,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
$$;

-- ------------------------------------------------------------------ tabela
create table if not exists public.clientes (
  id              uuid primary key default gen_random_uuid(),
  clinica_id      uuid not null references public.clinicas (id) on delete cascade,
  nome            text not null,
  telefone        text,
  email           citext,
  data_nascimento date,
  observacoes     text,
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint clientes_nome_nao_vazio check (length(btrim(nome)) between 2 and 120),
  constraint clientes_observacoes_tamanho check (
    observacoes is null or length(observacoes) <= 2000
  ),
  -- Data de nascimento serve para parabenizar, nao para viajar no tempo.
  constraint clientes_nascimento_plausivel check (
    data_nascimento is null
    or (data_nascimento > date '1900-01-01' and data_nascimento <= current_date)
  ),
  -- Permite a FK composta a partir de atendimentos, garantindo no banco que um
  -- atendimento nunca aponte para cliente de outro negocio.
  constraint clientes_id_clinica_unico unique (id, clinica_id)
);

create index if not exists idx_clientes_clinica_nome
  on public.clientes (clinica_id, nome);
create index if not exists idx_clientes_clinica_ativo
  on public.clientes (clinica_id, ativo);

-- Busca por nome sem diferenciar acento nem caixa: quem procura "tais" precisa
-- achar "Taís". O indice cobre o prefixo, que e como a busca da tela funciona.
create index if not exists idx_clientes_busca_nome
  on public.clientes (clinica_id, (lower(public.sem_acento(nome))) text_pattern_ops);

create index if not exists idx_clientes_telefone
  on public.clientes (clinica_id, telefone)
  where telefone is not null;

drop trigger if exists set_updated_at_clientes on public.clientes;
create trigger set_updated_at_clientes
  before update on public.clientes
  for each row execute function public.set_updated_at();

-- ------------------------------------------------- vinculo com atendimentos
alter table public.atendimentos
  add column if not exists cliente_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'atendimentos_cliente_mesma_clinica'
  ) then
    -- A lista de colunas depois de SET NULL nao e detalhe de estilo.
    -- Numa FK composta, "on delete set null" sem lista anula TODAS as colunas
    -- da chave - inclusive clinica_id, que e NOT NULL. O efeito seria nunca
    -- conseguir apagar uma cliente que ja tem atendimento: o DELETE falharia
    -- com um erro de not-null em clinica_id, que nao explica nada.
    -- Listando (cliente_id), so o vinculo e desfeito e o historico financeiro
    -- continua no lugar. Requer PostgreSQL 15+.
    alter table public.atendimentos
      add constraint atendimentos_cliente_mesma_clinica
      foreign key (cliente_id, clinica_id)
      references public.clientes (id, clinica_id)
      on delete set null (cliente_id);
  end if;
end $$;

create index if not exists idx_atendimentos_cliente
  on public.atendimentos (cliente_id, data_atendimento desc)
  where cliente_id is not null;

-- ------------------------------------------------------------------- RLS
alter table public.clientes enable row level security;

drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes for select to authenticated
  using (clinica_id = (select public.get_user_clinica_id()));

drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes for insert to authenticated
  with check (clinica_id = (select public.get_user_clinica_id()));

drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes for update to authenticated
  using (clinica_id = (select public.get_user_clinica_id()))
  with check (clinica_id = (select public.get_user_clinica_id()));

drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes for delete to authenticated
  using (clinica_id = (select public.get_user_clinica_id()));

revoke all on public.clientes from anon, authenticated;
grant select, insert, update, delete on public.clientes to authenticated;

-- ============================================================================
-- Consulta consolidada de clientes
--
-- O resumo (total gasto, numero de atendimentos, ultimo atendimento e
-- profissional preferida) e calculado no banco, num GROUP BY, em vez de a tela
-- buscar os clientes e depois um historico por cliente. Com 200 clientes,
-- aquele caminho seriam 201 consultas.
--
-- SECURITY INVOKER (padrao): as policies de clientes e atendimentos continuam
-- valendo, entao a funcao so enxerga o negocio do usuario autenticado.
-- ============================================================================
create or replace function public.clientes_com_resumo(
  p_busca         text default null,
  p_apenas_ativos boolean default true,
  p_limite        integer default 50,
  p_deslocamento  integer default 0,
  -- Quando informado, devolve so este cliente. A tela de perfil usa a MESMA
  -- funcao da listagem: dois calculos separados para "total gasto" acabariam
  -- divergindo, e o numero da lista brigaria com o do perfil.
  p_cliente_id    uuid default null
)
returns table (
  id                     uuid,
  nome                   text,
  telefone               text,
  email                  text,
  data_nascimento        date,
  observacoes            text,
  ativo                  boolean,
  criado_em              timestamptz,
  total_gasto            numeric,
  total_atendimentos     bigint,
  ultimo_atendimento     date,
  profissional_preferida text
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.nome,
    c.telefone,
    c.email::text,
    c.data_nascimento,
    c.observacoes,
    c.ativo,
    c.created_at,
    coalesce(sum(a.valor_total) filter (where a.status = 'realizado'), 0)::numeric,
    count(a.id) filter (where a.status = 'realizado'),
    max(a.data_atendimento) filter (where a.status = 'realizado'),
    preferida.nome
  from public.clientes c
  left join public.atendimentos a on a.cliente_id = c.id
  -- Profissional preferida = quem mais atendeu esta pessoa. Derivada do
  -- historico em vez de um campo a preencher: um campo manual nasce vazio e
  -- envelhece errado.
  left join lateral (
    select p.nome
    from public.atendimentos a2
    join public.profissionais p on p.id = a2.profissional_id
    where a2.cliente_id = c.id and a2.status = 'realizado'
    group by p.id, p.nome
    order by count(*) desc, max(a2.data_atendimento) desc
    limit 1
  ) preferida on true
  where (not p_apenas_ativos or c.ativo)
    and (p_cliente_id is null or c.id = p_cliente_id)
    and (
      p_busca is null
      or btrim(p_busca) = ''
      or lower(public.sem_acento(c.nome)) like '%' || lower(public.sem_acento(btrim(p_busca))) || '%'
      or regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g')
         like '%' || regexp_replace(p_busca, '\D', '', 'g') || '%'
         and regexp_replace(p_busca, '\D', '', 'g') <> ''
    )
  group by c.id, c.nome, c.telefone, c.email, c.data_nascimento,
           c.observacoes, c.ativo, c.created_at, preferida.nome
  order by c.nome
  limit greatest(1, least(coalesce(p_limite, 50), 200))
  offset greatest(0, coalesce(p_deslocamento, 0));
$$;

-- Uma assinatura antiga ficaria orfa depois da mudanca de parametros e
-- continuaria executavel; remover explicitamente evita esse fantasma.
drop function if exists public.clientes_com_resumo(text, boolean, integer, integer);

revoke all on function public.clientes_com_resumo(text, boolean, integer, integer, uuid) from public;
grant execute on function public.clientes_com_resumo(text, boolean, integer, integer, uuid)
  to authenticated, service_role;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>  005_agenda.sql  <<<<<<<<<<<<<<<<<<<<<<<<<<

-- =============================================================================
-- GlowScale - Agenda (agendamentos)
--
-- `escalas` guarda o turno da profissional ("Ana trabalha terca das 9h as
-- 18h"). Isto e outra coisa: o compromisso com uma pessoa ("Julia as 14h,
-- alongamento, com Ana"). As duas convivem - o turno diz quando ha
-- disponibilidade, o agendamento ocupa um pedaco dela.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

-- Necessaria para o EXCLUDE la embaixo: permite comparar uuid por igualdade
-- dentro de um indice GiST, que sozinho so sabe lidar com ranges.
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'agendamento_status') then
    create type public.agendamento_status as enum (
      'agendado',    -- marcado, ainda nao confirmado pela cliente
      'confirmado',  -- cliente confirmou presenca
      'concluido',   -- atendimento aconteceu
      'cancelado',   -- desmarcado
      'faltou'       -- nao apareceu (no-show)
    );
  end if;
end $$;

create table if not exists public.agendamentos (
  id              uuid primary key default gen_random_uuid(),
  clinica_id      uuid not null references public.clinicas (id) on delete cascade,
  cliente_id      uuid,
  profissional_id uuid not null,
  procedimento_id uuid not null,
  data            date not null,
  hora_inicio     time not null,
  hora_fim        time not null,
  status          public.agendamento_status not null default 'agendado',
  observacoes     text,
  -- Preenchido quando o agendamento vira lancamento financeiro. Evita que
  -- concluir duas vezes gere comissao em dobro.
  atendimento_id  uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint agendamentos_horario_valido check (hora_inicio < hora_fim),
  constraint agendamentos_observacoes_tamanho check (
    observacoes is null or length(observacoes) <= 1000
  ),

  -- FKs compostas: o segundo elemento e sempre clinica_id, entao o banco
  -- garante que profissional, servico e cliente sao todos do mesmo negocio.
  -- Sem isso, um id adulterado no formulario montaria um agendamento
  -- costurando dados de dois inquilinos.
  constraint agendamentos_profissional_mesma_clinica
    foreign key (profissional_id, clinica_id)
    references public.profissionais (id, clinica_id) on delete cascade,
  constraint agendamentos_procedimento_mesma_clinica
    foreign key (procedimento_id, clinica_id)
    references public.procedimentos (id, clinica_id) on delete cascade,
  -- Lista de colunas obrigatoria: sem ela o SET NULL anularia clinica_id
  -- junto, que e NOT NULL, e apagar um cliente com agendamento falharia.
  constraint agendamentos_cliente_mesma_clinica
    foreign key (cliente_id, clinica_id)
    references public.clientes (id, clinica_id) on delete set null (cliente_id),

  constraint agendamentos_id_clinica_unico unique (id, clinica_id)
);

-- ------------------------------------------------------- anti-sobreposicao
-- A regra que faz a agenda valer: a mesma profissional nao pode ter dois
-- compromissos que se cruzam no tempo.
--
-- Feito com EXCLUDE em vez de uma checagem no servidor de proposito. Duas
-- recepcionistas marcando ao mesmo tempo passariam por qualquer verificacao
-- do tipo "consulta antes, insere depois": entre a consulta e o insert existe
-- uma janela, e as duas leriam "livre". O EXCLUDE e avaliado pelo banco no
-- momento da escrita, entao a segunda transacao e recusada.
--
-- tsrange e meio-aberto: [14:00, 15:00) e [15:00, 16:00) NAO se cruzam, que e
-- exatamente como agenda funciona - um atendimento comeca quando o outro
-- termina.
--
-- Cancelado e falta ficam de fora: o horario volta a ficar livre.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_sem_sobreposicao'
  ) then
    alter table public.agendamentos
      add constraint agendamentos_sem_sobreposicao
      exclude using gist (
        profissional_id with =,
        tsrange(data + hora_inicio, data + hora_fim) with &&
      )
      where (status not in ('cancelado', 'faltou'));
  end if;
end $$;

create index if not exists idx_agendamentos_clinica_data
  on public.agendamentos (clinica_id, data, hora_inicio);
create index if not exists idx_agendamentos_profissional_data
  on public.agendamentos (profissional_id, data, hora_inicio);
create index if not exists idx_agendamentos_cliente
  on public.agendamentos (cliente_id, data desc)
  where cliente_id is not null;

drop trigger if exists set_updated_at_agendamentos on public.agendamentos;
create trigger set_updated_at_agendamentos
  before update on public.agendamentos
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS
alter table public.agendamentos enable row level security;

drop policy if exists agendamentos_select on public.agendamentos;
create policy agendamentos_select on public.agendamentos for select to authenticated
  using (clinica_id = (select public.get_user_clinica_id()));

drop policy if exists agendamentos_insert on public.agendamentos;
create policy agendamentos_insert on public.agendamentos for insert to authenticated
  with check (clinica_id = (select public.get_user_clinica_id()));

drop policy if exists agendamentos_update on public.agendamentos;
create policy agendamentos_update on public.agendamentos for update to authenticated
  using (clinica_id = (select public.get_user_clinica_id()))
  with check (clinica_id = (select public.get_user_clinica_id()));

drop policy if exists agendamentos_delete on public.agendamentos;
create policy agendamentos_delete on public.agendamentos for delete to authenticated
  using (clinica_id = (select public.get_user_clinica_id()));

revoke all on public.agendamentos from anon, authenticated;
grant select, insert, update, delete on public.agendamentos to authenticated;


