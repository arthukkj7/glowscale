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
