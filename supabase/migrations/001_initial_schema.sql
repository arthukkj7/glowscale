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
