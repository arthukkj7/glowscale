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
