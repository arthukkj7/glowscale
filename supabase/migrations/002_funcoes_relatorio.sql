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
