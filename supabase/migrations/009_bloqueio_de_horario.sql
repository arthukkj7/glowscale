-- =============================================================================
-- GlowScale - bloqueio de horario
--
-- A agenda impedia dois clientes no mesmo horario, mas deixava marcar em cima
-- do almoco - porque almoco nao existia no sistema. Folga, feriado, consulta
-- medica e ferias tambem nao.
--
-- O bloqueio entra como uma LINHA DE AGENDAMENTO, nao numa tabela propria.
-- Numa tabela separada, a constraint EXCLUDE que impede sobreposicao nao
-- alcancaria os dois - o PostgreSQL nao cruza tabelas num EXCLUDE - e seria
-- preciso reimplementar a checagem no servidor, com a mesma janela de corrida
-- que o EXCLUDE existe para fechar. Como linha, o bloqueio herda a regra de
-- graca: marcar cliente sobre um bloqueio e recusado pelo banco.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

alter table public.agendamentos
  add column if not exists tipo text not null default 'atendimento';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agendamentos_tipo_valido') then
    alter table public.agendamentos
      add constraint agendamentos_tipo_valido check (tipo in ('atendimento', 'bloqueio'));
  end if;
end $$;

-- Bloqueio nao tem servico: e tempo indisponivel, nao trabalho.
alter table public.agendamentos alter column procedimento_id drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_atendimento_tem_servico'
  ) then
    -- Atendimento sem servico nao teria valor nem comissao para lancar depois.
    alter table public.agendamentos
      add constraint agendamentos_atendimento_tem_servico
      check (tipo <> 'atendimento' or procedimento_id is not null);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agendamentos_bloqueio_sem_cliente'
  ) then
    -- Bloqueio com cliente seria um atendimento disfarcado, e apareceria no
    -- historico da pessoa como se ela tivesse vindo.
    alter table public.agendamentos
      add constraint agendamentos_bloqueio_sem_cliente
      check (tipo <> 'bloqueio' or cliente_id is null);
  end if;
end $$;

create index if not exists idx_agendamentos_tipo
  on public.agendamentos (clinica_id, tipo, data);

-- ---------------------------------------------------------------- criacao
/**
 * Cria um bloqueio por dia no intervalo pedido.
 *
 * Um bloqueio por dia, e nao uma linha com data inicial e final, porque e
 * assim que a agenda le: cada dia precisa saber sozinho que aquele horario
 * esta ocupado, e a constraint EXCLUDE compara faixas dentro do mesmo dia.
 *
 * Cobre os tres casos reais com uma unica funcao: almoco (mesmo horario,
 * varios dias), folga de um dia, e ferias (dia inteiro, muitos dias).
 *
 * Dias que ja tem compromisso naquele horario sao PULADOS, e devolvidos na
 * lista de conflitos. Falhar tudo porque a terca tem uma cliente marcada
 * obrigaria a pessoa a adivinhar qual dia deu problema.
 */
create or replace function public.bloquear_horario(
  p_profissional_id uuid,
  p_data_inicial    date,
  p_data_final      date,
  p_hora_inicio     time,
  p_hora_fim        time,
  p_motivo          text default null
)
returns table (dias_bloqueados integer, dias_em_conflito date[])
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_clinica_id uuid := (select public.get_user_clinica_id());
  v_dia        date;
  v_criados    integer := 0;
  v_conflitos  date[] := '{}';
begin
  if v_clinica_id is null then
    raise exception 'nao autenticado' using errcode = '28000';
  end if;
  if p_data_final < p_data_inicial then
    raise exception 'data final antes da inicial' using errcode = '22007';
  end if;
  if p_hora_fim <= p_hora_inicio then
    raise exception 'horario final deve ser maior que o inicial' using errcode = '22007';
  end if;
  -- Um intervalo aberto demais quase sempre e erro de digitacao, e criaria
  -- centenas de linhas antes de alguem perceber.
  if p_data_final - p_data_inicial > 366 then
    raise exception 'intervalo maior que um ano' using errcode = '22003';
  end if;

  v_dia := p_data_inicial;
  while v_dia <= p_data_final loop
    begin
      insert into public.agendamentos (
        clinica_id, profissional_id, procedimento_id, cliente_id,
        data, hora_inicio, hora_fim, status, tipo, observacoes
      )
      values (
        v_clinica_id, p_profissional_id, null, null,
        v_dia, p_hora_inicio, p_hora_fim, 'confirmado', 'bloqueio',
        nullif(btrim(coalesce(p_motivo, '')), '')
      );
      v_criados := v_criados + 1;
    exception
      when exclusion_violation then
        v_conflitos := v_conflitos || v_dia;
    end;
    v_dia := v_dia + 1;
  end loop;

  return query select v_criados, v_conflitos;
end;
$$;

revoke all on function public.bloquear_horario(uuid, date, date, time, time, text) from public;
grant execute on function public.bloquear_horario(uuid, date, date, time, time, text)
  to authenticated;
