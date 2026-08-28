-- =============================================================================
-- GlowScale - apoio ao painel
--
-- Clientes que sumiram. E a consulta que transforma o painel de "quadro de
-- avisos" em ferramenta: ela nao mostra o que ja aconteceu, mostra o que da
-- para fazer hoje.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

create or replace function public.clientes_inativos(
  p_dias   integer default 30,
  p_limite integer default 20
)
returns table (
  id                 uuid,
  nome               text,
  telefone           text,
  ultimo_atendimento date,
  dias_sem_vir       integer,
  total_gasto        numeric
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.nome,
    c.telefone,
    max(a.data_atendimento),
    (current_date - max(a.data_atendimento))::integer,
    coalesce(sum(a.valor_total), 0)::numeric
  from public.clientes c
  join public.atendimentos a
    on a.cliente_id = c.id
   and a.status = 'realizado'
  where c.ativo
  group by c.id, c.nome, c.telefone
  -- Exige ao menos um atendimento (garantido pelo JOIN): quem nunca veio nao
  -- esta "inativo", esta por vir - e apareceria aqui todo dia sem ter sumido.
  having current_date - max(a.data_atendimento) >= greatest(1, coalesce(p_dias, 30))
  -- Quem sumiu ha mais tempo primeiro: e a lista de quem esta mais perto de
  -- ser perdida de vez.
  order by max(a.data_atendimento) asc
  limit greatest(1, least(coalesce(p_limite, 20), 100));
$$;

revoke all on function public.clientes_inativos(integer, integer) from public;
grant execute on function public.clientes_inativos(integer, integer)
  to authenticated, service_role;
