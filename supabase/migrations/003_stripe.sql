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
