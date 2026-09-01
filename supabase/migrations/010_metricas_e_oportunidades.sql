-- =============================================================================
-- GlowScale - metricas do painel e oportunidades
--
-- Tres consultas que so precisavam ser escritas: os dados ja estavam todos no
-- banco, sem uso.
--
--   metricas_do_periodo  - ticket medio, novos x recorrentes, taxa de retorno
--   aniversariantes      - data_nascimento existia e ninguem lia
--   clientes_vip         - quem mais gastou, para tratar diferente
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

/**
 * Indicadores de um periodo.
 *
 * "Recorrente" e quem foi atendida no periodo E ja tinha vindo ANTES dele -
 * nao quem veio duas vezes dentro do periodo. A diferenca importa: no recorte
 * de um mes, a segunda definicao chamaria de recorrente uma cliente que
 * apareceu pela primeira vez na vida no dia 3.
 *
 * Taxa de retorno = recorrentes / atendidas. E a pergunta que o negocio faz:
 * "de quem me procurou este mes, quantas ja me conheciam?"
 */
create or replace function public.metricas_do_periodo(
  p_data_inicial date,
  p_data_final   date
)
returns table (
  faturamento          numeric,
  comissoes            numeric,
  atendimentos         bigint,
  ticket_medio         numeric,
  clientes_atendidos   bigint,
  clientes_novos       bigint,
  clientes_recorrentes bigint,
  taxa_de_retorno      numeric
)
language sql
stable
set search_path = public
as $$
  with no_periodo as (
    select a.cliente_id, a.valor_total, a.valor_comissao
    from public.atendimentos a
    where a.status = 'realizado'
      and a.data_atendimento between p_data_inicial and p_data_final
  ),
  identificadas as (
    select distinct cliente_id
    from no_periodo
    where cliente_id is not null
  ),
  recorrentes as (
    select i.cliente_id
    from identificadas i
    where exists (
      select 1 from public.atendimentos anterior
      where anterior.cliente_id = i.cliente_id
        and anterior.status = 'realizado'
        and anterior.data_atendimento < p_data_inicial
    )
  )
  select
    coalesce(sum(p.valor_total), 0)::numeric,
    coalesce(sum(p.valor_comissao), 0)::numeric,
    count(*),
    -- Ticket medio por ATENDIMENTO, nao por cliente: e o numero que responde
    -- "quanto entra por vez que alguem senta na cadeira".
    case when count(*) = 0 then 0
         else round(coalesce(sum(p.valor_total), 0) / count(*), 2) end,
    (select count(*) from identificadas),
    (select count(*) from identificadas) - (select count(*) from recorrentes),
    (select count(*) from recorrentes),
    case when (select count(*) from identificadas) = 0 then 0
         else round(
           (select count(*) from recorrentes)::numeric * 100
           / (select count(*) from identificadas), 1
         ) end
  from no_periodo p;
$$;

/**
 * Aniversariantes dos proximos dias.
 *
 * Compara mes e dia contra uma serie de datas em vez de fazer aritmetica com o
 * ano: assim a virada de ano (28/12 a 03/01) funciona sem caso especial.
 *
 * Quem nasceu em 29/02 nao aparece em ano comum. Preferi isso a "arredondar"
 * para 28/02 ou 01/03: parabenizar no dia errado e pior do que nao parabenizar.
 */
create or replace function public.aniversariantes(p_dias integer default 7)
returns table (
  id            uuid,
  nome          text,
  telefone      text,
  data_nascimento date,
  dias_ate      integer,
  idade         integer
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.nome,
    c.telefone,
    c.data_nascimento,
    -- generate_series com interval devolve timestamp: sem o cast para date,
    -- a subtracao daria um interval e nao um numero de dias.
    (d.dia::date - current_date)::integer,
    extract(year from age(d.dia::date, c.data_nascimento))::integer
  from public.clientes c
  join lateral (
    select dia
    from generate_series(
      current_date::timestamp,
      (current_date + greatest(0, least(coalesce(p_dias, 7), 365)))::timestamp,
      interval '1 day'
    ) as dia
    where extract(month from dia) = extract(month from c.data_nascimento)
      and extract(day from dia) = extract(day from c.data_nascimento)
    limit 1
  ) d on true
  where c.ativo and c.data_nascimento is not null
  order by d.dia, c.nome;
$$;

/**
 * Quem mais gastou num periodo recente.
 *
 * Serve para tratar diferente quem sustenta o negocio - lembrar de um mimo,
 * priorizar um encaixe. Por isso ordena por valor, e nao por frequencia:
 * quem vem toda semana fazer a unha simples nao e o mesmo caso de quem faz
 * um procedimento caro a cada dois meses.
 */
create or replace function public.clientes_vip(
  p_dias    integer default 90,
  p_minimo  numeric default 0,
  p_limite  integer default 10
)
returns table (
  id                 uuid,
  nome               text,
  telefone           text,
  total_gasto        numeric,
  total_atendimentos bigint,
  ultimo_atendimento date
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.nome,
    c.telefone,
    sum(a.valor_total)::numeric,
    count(a.id),
    max(a.data_atendimento)
  from public.clientes c
  join public.atendimentos a
    on a.cliente_id = c.id
   and a.status = 'realizado'
   and a.data_atendimento >= current_date - greatest(1, coalesce(p_dias, 90))
  where c.ativo
  group by c.id, c.nome, c.telefone
  having sum(a.valor_total) >= greatest(0, coalesce(p_minimo, 0))
  order by sum(a.valor_total) desc
  limit greatest(1, least(coalesce(p_limite, 10), 100));
$$;

revoke all on function public.metricas_do_periodo(date, date) from public;
revoke all on function public.aniversariantes(integer) from public;
revoke all on function public.clientes_vip(integer, numeric, integer) from public;
grant execute on function public.metricas_do_periodo(date, date) to authenticated, service_role;
grant execute on function public.aniversariantes(integer) to authenticated, service_role;
grant execute on function public.clientes_vip(integer, numeric, integer) to authenticated, service_role;

-- ------------------------------------------------------------ tipo de negocio
-- Guardado para escolher os servicos sugeridos no primeiro acesso e adaptar
-- os textos. Texto livre com check, e nao enum, porque a lista vai crescer e
-- alterar enum exige migration a cada nome novo.
alter table public.clinicas
  add column if not exists tipo_negocio text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clinicas_tipo_negocio_valido') then
    alter table public.clinicas
      add constraint clinicas_tipo_negocio_valido
      check (tipo_negocio is null or tipo_negocio in (
        'manicure', 'lash', 'sobrancelha', 'estetica', 'cabelo',
        'barbearia', 'maquiagem', 'massagem', 'depilacao', 'outro'
      ));
  end if;
end $$;

grant update (nome, nome_fantasia, documento, email, telefone, cidade, estado, tipo_negocio)
  on public.clinicas to authenticated;
