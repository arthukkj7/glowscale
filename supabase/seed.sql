-- =============================================================================
-- GlowScale - Seed de demonstracao
--
-- Este seed NAO cria usuarios no Supabase Auth (isso deve ser feito pelo fluxo
-- de cadastro da aplicacao ou pelo painel do Supabase). Ele cria uma clinica de
-- demonstracao com dados de negocio consistentes.
--
-- Para enxergar esses dados logado na aplicacao, crie um usuario pelo /cadastro
-- e depois aponte o perfil dele para a clinica de demonstracao:
--
--   update public.usuarios
--      set clinica_id = '11111111-1111-4111-8111-111111111111'
--    where email = 'seu-email@exemplo.com';
--
-- Rode com:  psql "$DATABASE_URL" -f supabase/seed.sql
--        ou: supabase db reset   (aplica migrations + seed)
-- =============================================================================

begin;

-- ---------------------------------------------------------------- clinica --
insert into public.clinicas (id, nome, nome_fantasia, email, telefone, cidade, estado, status)
values (
  '11111111-1111-4111-8111-111111111111',
  'Clinica Demonstracao GlowScale',
  'GlowScale Demo',
  'contato@demo.glowscale.app',
  '(11) 90000-0000',
  'Sao Paulo',
  'SP',
  'trial'
)
on conflict (id) do nothing;

insert into public.assinaturas (clinica_id, status, plano, valor, ciclo, data_inicio)
values (
  '11111111-1111-4111-8111-111111111111',
  'trial',
  'essencial',
  97.00,
  'MONTHLY',
  current_date
)
on conflict (clinica_id) do nothing;

-- ----------------------------------------------------------- profissionais --
insert into public.profissionais (id, clinica_id, nome, email, telefone, especialidade, percentual_comissao, ativo)
values
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-111111111111',
   'Ana Beatriz Souza', 'ana@demo.glowscale.app', '(11) 91111-0001', 'Estetica facial', 40.00, true),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-111111111111',
   'Julia Menezes', 'julia@demo.glowscale.app', '(11) 91111-0002', 'Estetica corporal', 35.00, true),
  ('22222222-2222-4222-8222-000000000003', '11111111-1111-4111-8111-111111111111',
   'Carla Ribeiro', 'carla@demo.glowscale.app', '(11) 91111-0003', 'Depilacao a laser', 50.00, true),
  ('22222222-2222-4222-8222-000000000004', '11111111-1111-4111-8111-111111111111',
   'Marina Alves', null, null, 'Micropigmentacao', 45.00, false)
on conflict (id) do nothing;

-- ----------------------------------------------------------- procedimentos --
insert into public.procedimentos (id, clinica_id, nome, descricao, valor, duracao_minutos, ativo)
values
  ('33333333-3333-4333-8333-000000000001', '11111111-1111-4111-8111-111111111111',
   'Limpeza de pele profunda', 'Higienizacao, extracao e mascara calmante.', 200.00, 60, true),
  ('33333333-3333-4333-8333-000000000002', '11111111-1111-4111-8111-111111111111',
   'Massagem modeladora', 'Sessao de 50 minutos com foco em contorno corporal.', 150.00, 50, true),
  ('33333333-3333-4333-8333-000000000003', '11111111-1111-4111-8111-111111111111',
   'Depilacao a laser - axilas', 'Sessao unica de laser de diodo.', 120.00, 30, true),
  ('33333333-3333-4333-8333-000000000004', '11111111-1111-4111-8111-111111111111',
   'Design de sobrancelhas', 'Design com henna inclusa.', 80.00, 40, true),
  ('33333333-3333-4333-8333-000000000005', '11111111-1111-4111-8111-111111111111',
   'Peeling de diamante', 'Esfoliacao mecanica com renovacao celular.', 250.00, 60, true)
on conflict (id) do nothing;

-- ------------------------------------------------------------ atendimentos --
-- valor_total, valor_comissao e valor_clinica sao colunas geradas pelo banco.
insert into public.atendimentos (
  clinica_id, profissional_id, procedimento_id, data_atendimento,
  quantidade, valor_unitario, comissao_percentual, status, observacoes
)
select
  '11111111-1111-4111-8111-111111111111',
  p.profissional_id,
  p.procedimento_id,
  current_date - p.dias,
  p.quantidade,
  p.valor_unitario,
  p.comissao,
  p.status::public.atendimento_status,
  p.observacoes
from (
  values
    ('22222222-2222-4222-8222-000000000001'::uuid, '33333333-3333-4333-8333-000000000001'::uuid,  1, 1, 200.00, 40.00, 'realizado', 'Cliente retorna em 30 dias.'),
    ('22222222-2222-4222-8222-000000000001'::uuid, '33333333-3333-4333-8333-000000000005'::uuid,  2, 1, 250.00, 40.00, 'realizado', null),
    ('22222222-2222-4222-8222-000000000001'::uuid, '33333333-3333-4333-8333-000000000001'::uuid,  4, 2, 200.00, 40.00, 'realizado', 'Pacote de duas sessoes.'),
    ('22222222-2222-4222-8222-000000000002'::uuid, '33333333-3333-4333-8333-000000000002'::uuid,  1, 1, 150.00, 35.00, 'realizado', null),
    ('22222222-2222-4222-8222-000000000002'::uuid, '33333333-3333-4333-8333-000000000002'::uuid,  3, 3, 150.00, 35.00, 'realizado', 'Pacote fechado.'),
    ('22222222-2222-4222-8222-000000000002'::uuid, '33333333-3333-4333-8333-000000000004'::uuid,  6, 1,  80.00, 35.00, 'cancelado', 'Cliente nao compareceu.'),
    ('22222222-2222-4222-8222-000000000003'::uuid, '33333333-3333-4333-8333-000000000003'::uuid,  2, 1, 120.00, 50.00, 'realizado', null),
    ('22222222-2222-4222-8222-000000000003'::uuid, '33333333-3333-4333-8333-000000000003'::uuid,  5, 2, 120.00, 50.00, 'realizado', null),
    ('22222222-2222-4222-8222-000000000003'::uuid, '33333333-3333-4333-8333-000000000004'::uuid,  8, 1,  80.00, 50.00, 'realizado', null),
    ('22222222-2222-4222-8222-000000000001'::uuid, '33333333-3333-4333-8333-000000000004'::uuid, 12, 1,  80.00, 40.00, 'realizado', null),
    ('22222222-2222-4222-8222-000000000002'::uuid, '33333333-3333-4333-8333-000000000005'::uuid, 15, 1, 250.00, 35.00, 'realizado', null),
    ('22222222-2222-4222-8222-000000000003'::uuid, '33333333-3333-4333-8333-000000000001'::uuid, 20, 1, 200.00, 50.00, 'realizado', null)
) as p (profissional_id, procedimento_id, dias, quantidade, valor_unitario, comissao, status, observacoes)
where not exists (
  select 1 from public.atendimentos
  where clinica_id = '11111111-1111-4111-8111-111111111111'
);

-- ------------------------------------------------------------------ escalas --
-- Turnos da semana corrente (segunda a sabado).
insert into public.escalas (clinica_id, profissional_id, data, hora_inicio, hora_fim, observacoes)
select
  '11111111-1111-4111-8111-111111111111',
  e.profissional_id,
  date_trunc('week', current_date)::date + e.dia_offset,
  e.hora_inicio::time,
  e.hora_fim::time,
  e.observacoes
from (
  values
    ('22222222-2222-4222-8222-000000000001'::uuid, 0, '08:00', '18:00', null),
    ('22222222-2222-4222-8222-000000000001'::uuid, 1, '08:00', '18:00', null),
    ('22222222-2222-4222-8222-000000000001'::uuid, 3, '08:00', '18:00', null),
    ('22222222-2222-4222-8222-000000000001'::uuid, 4, '08:00', '18:00', null),
    ('22222222-2222-4222-8222-000000000001'::uuid, 5, '09:00', '14:00', 'Plantao de sabado'),
    ('22222222-2222-4222-8222-000000000002'::uuid, 1, '10:00', '19:00', null),
    ('22222222-2222-4222-8222-000000000002'::uuid, 2, '10:00', '19:00', null),
    ('22222222-2222-4222-8222-000000000002'::uuid, 4, '10:00', '19:00', null),
    ('22222222-2222-4222-8222-000000000003'::uuid, 0, '12:00', '20:00', null),
    ('22222222-2222-4222-8222-000000000003'::uuid, 2, '12:00', '20:00', null),
    ('22222222-2222-4222-8222-000000000003'::uuid, 4, '12:00', '20:00', null)
) as e (profissional_id, dia_offset, hora_inicio, hora_fim, observacoes)
on conflict on constraint escalas_turno_unico do nothing;

commit;
