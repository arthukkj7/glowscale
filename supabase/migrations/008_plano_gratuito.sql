-- =============================================================================
-- GlowScale - plano gratuito e queda suave
--
-- Substitui os tres planos pagos (solo/studio/scale) por dois niveis:
--
--   free  - gratuito para sempre, limitado
--   pro   - completo, cobrado por mes ou por ano
--
-- Mensal e anual sao o MESMO nivel: o que muda e o preco, nao o que a pessoa
-- pode fazer. Cobrar diferente pelo mesmo produto conforme o periodo e
-- desconto; travar recursos por periodo seria arbitrario.
--
-- E a mudanca de comportamento que importa: quando o teste acaba, o negocio
-- NAO e mais bloqueado - ele passa a valer como 'free'. Com um plano gratuito
-- no cardapio, trancar a porta seria contraditorio, e quem continua usando de
-- graca e exatamente quem se converte depois.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

-- --------------------------------------------------- remapeamento dos planos
alter table public.clinicas drop constraint if exists clinicas_plano_valido;

update public.clinicas
   set plano = case
     when plano in ('solo', 'studio', 'scale') then 'pro'
     when plano = 'trial' then 'trial'
     else plano
   end
 where plano not in ('trial', 'free', 'pro');

alter table public.clinicas
  add constraint clinicas_plano_valido
  check (plano in ('trial', 'free', 'pro'));

-- ------------------------------------------------------------ plano efetivo
/**
 * O plano que realmente vale agora.
 *
 * Diferente de clinicas.plano, que guarda o CONTRATADO. Um negocio com
 * plano='pro' e assinatura vencida nao pode continuar usando os limites do
 * Pro; e um em teste vale como completo ate a data acabar.
 *
 * Toda checagem de limite passa por aqui. Ler clinicas.plano direto seria o
 * caminho para alguem manter os privilegios do Pro depois de parar de pagar.
 */
create or replace function public.plano_efetivo(p_clinica_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when c.status = 'blocked' then 'free'
    when c.status = 'active'  then c.plano
    when c.status = 'trial'
      and coalesce(c.trial_termina_em, current_date) >= current_date then 'trial'
    -- Teste vencido, inadimplente ou cancelado: cai para o gratuito em vez de
    -- perder o acesso. Os dados ja cadastrados continuam la.
    else 'free'
  end
  from public.clinicas c
  where c.id = p_clinica_id;
$$;

revoke all on function public.plano_efetivo(uuid) from public;
grant execute on function public.plano_efetivo(uuid) to authenticated, service_role;

-- ------------------------------------------------------------------ limites
create or replace function public.limite_do_plano(p_plano text, p_recurso text)
returns integer
language sql
immutable
parallel safe
as $$
  select case p_plano
    -- Durante o teste, tudo liberado: cobrar antes de mostrar o que o produto
    -- faz e o caminho mais curto para a pessoa concluir que nao serve para ela.
    when 'trial' then null
    when 'pro'   then null
    when 'free'  then case p_recurso
                        when 'profissionais' then 1
                        when 'usuarios'      then 1
                        -- 30 clientes cabe uma agenda de verdade de quem esta
                        -- comecando, e aperta quando o negocio cresce - que e
                        -- exatamente quando pagar passa a fazer sentido.
                        when 'clientes'      then 30
                        else null
                      end
    else 0
  end;
$$;

create or replace function public.plano_libera(p_plano text, p_recurso text)
returns boolean
language sql
immutable
parallel safe
as $$
  select case p_recurso
    when 'reativacao'             then p_plano in ('trial', 'pro')
    when 'relatorio_profissional' then p_plano in ('trial', 'pro')
    when 'exportar'               then p_plano in ('trial', 'pro')
    else true
  end;
$$;

-- ------------------------------- o trigger passa a olhar o plano EFETIVO
create or replace function public.checar_limite_do_plano()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plano  text;
  v_limite integer;
  v_atual  integer;
begin
  v_plano := public.plano_efetivo(new.clinica_id);
  if v_plano is null then
    return new;
  end if;

  v_limite := public.limite_do_plano(v_plano, tg_argv[0]);
  if v_limite is null then
    return new;
  end if;

  execute format('select count(*) from public.%I where clinica_id = $1', tg_argv[0])
    into v_atual using new.clinica_id;

  if v_atual >= v_limite then
    raise exception
      'limite do plano atingido: % permite % em %', v_plano, v_limite, tg_argv[0]
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------------ acesso
/**
 * Quem pode entrar no sistema.
 *
 * Agora so 'blocked' fecha a porta - e isso e acao administrativa nossa, nao
 * consequencia de nao pagar. Teste vencido, inadimplencia e cancelamento
 * levam ao plano gratuito, com os dados intactos.
 *
 * Trocar bloqueio por rebaixamento nao e generosidade: um negocio que perde o
 * acesso a propria agenda no meio do expediente nao volta depois.
 */
create or replace function public.clinica_tem_acesso(p_clinica_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.status <> 'blocked'
  from public.clinicas c
  where c.id = p_clinica_id;
$$;
