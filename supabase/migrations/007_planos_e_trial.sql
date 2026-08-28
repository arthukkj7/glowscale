-- =============================================================================
-- GlowScale - planos e periodo de teste
--
-- Ate aqui todo negocio nascia em 'trial' e NADA nunca o tirava dali: sem data
-- de fim, sem verificacao, sem cobranca. O produto era gratuito para sempre.
-- Esta migration fecha esse buraco e introduz os tres planos.
--
-- Idempotente: pode rodar de novo sem quebrar.
-- =============================================================================

-- ------------------------------------------------------------------ colunas
alter table public.clinicas
  add column if not exists plano            text not null default 'trial',
  add column if not exists trial_termina_em date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clinicas_plano_valido') then
    alter table public.clinicas
      add constraint clinicas_plano_valido
      check (plano in ('trial', 'solo', 'studio', 'scale'));
  end if;
end $$;

-- Negocios que ja existiam nao podem ficar sem data de fim: sem isto,
-- continuariam no acesso vitalicio que esta migration veio corrigir.
update public.clinicas
   set trial_termina_em = (created_at at time zone 'America/Sao_Paulo')::date + 7
 where trial_termina_em is null;

-- ------------------------------------------------------------------ limites
/**
 * Limite de um recurso em cada plano. NULL significa ilimitado.
 *
 * Uma funcao em vez de uma tabela de propósito: sao dados de produto, nao do
 * inquilino. Numa tabela, cada instalacao poderia divergir - e um UPDATE
 * acidental viraria "todo mundo com plano ilimitado" sem deixar rastro no
 * historico do repositorio.
 */
create or replace function public.limite_do_plano(p_plano text, p_recurso text)
returns integer
language sql
immutable
parallel safe
as $$
  select case p_plano
    -- Durante o teste o negocio experimenta o plano mais completo. Cobrar
    -- antes de mostrar o que o produto faz e o caminho mais curto para a
    -- pessoa concluir que nao serve para ela.
    when 'trial'  then null
    when 'scale'  then null
    when 'studio' then case p_recurso
                         when 'profissionais' then 5
                         when 'usuarios'      then 3
                         else null
                       end
    when 'solo'   then case p_recurso
                         when 'profissionais' then 1
                         when 'usuarios'      then 1
                         when 'clientes'      then 500
                         else null
                       end
    else 0
  end;
$$;

/**
 * Recurso liberado no plano.
 *
 * Separado dos limites porque a pergunta e outra: "quantos posso ter" versus
 * "posso usar isto".
 */
create or replace function public.plano_libera(p_plano text, p_recurso text)
returns boolean
language sql
immutable
parallel safe
as $$
  select case p_recurso
    -- Reativacao de clientes e relatorio por profissional nao fazem sentido
    -- para quem atende sozinha: ela nao tem equipe para comparar. O corte
    -- segue o valor real, nao uma trava artificial.
    when 'reativacao'            then p_plano in ('trial', 'studio', 'scale')
    when 'relatorio_profissional' then p_plano in ('trial', 'studio', 'scale')
    when 'exportar'              then p_plano in ('trial', 'scale')
    else true
  end;
$$;

revoke all on function public.limite_do_plano(text, text) from public;
revoke all on function public.plano_libera(text, text) from public;
grant execute on function public.limite_do_plano(text, text) to authenticated, service_role;
grant execute on function public.plano_libera(text, text) to authenticated, service_role;

-- --------------------------------------------------- aplicacao dos limites
/**
 * Barra a criacao acima do limite do plano.
 *
 * Vive num trigger, nao so na Server Action: a chave publicavel do Supabase
 * vai para o navegador, entao qualquer pessoa pode falar direto com o
 * PostgREST e inserir sem passar pela nossa aplicacao. Sem o trigger, o limite
 * seria uma sugestao.
 *
 * So conta na INSERCAO. Quem baixa de plano mantem o que ja cadastrou - a
 * alternativa seria o sistema apagar dados da cliente por causa de uma troca
 * de plano, o que e inaceitavel. Ela apenas nao adiciona mais.
 */
create or replace function public.checar_limite_do_plano()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plano   text;
  v_limite  integer;
  v_atual   integer;
begin
  select c.plano into v_plano from public.clinicas c where c.id = new.clinica_id;
  if v_plano is null then
    return new;
  end if;

  v_limite := public.limite_do_plano(v_plano, tg_argv[0]);
  if v_limite is null then
    return new;
  end if;

  execute format(
    'select count(*) from public.%I where clinica_id = $1',
    tg_argv[0]
  ) into v_atual using new.clinica_id;

  if v_atual >= v_limite then
    raise exception
      'limite do plano atingido: % permite % em %', v_plano, v_limite, tg_argv[0]
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists limite_profissionais on public.profissionais;
create trigger limite_profissionais
  before insert on public.profissionais
  for each row execute function public.checar_limite_do_plano('profissionais');

drop trigger if exists limite_usuarios on public.usuarios;
create trigger limite_usuarios
  before insert on public.usuarios
  for each row execute function public.checar_limite_do_plano('usuarios');

drop trigger if exists limite_clientes on public.clientes;
create trigger limite_clientes
  before insert on public.clientes
  for each row execute function public.checar_limite_do_plano('clientes');

-- --------------------------------------------------------- acesso ao sistema
/**
 * O negocio pode usar o sistema agora?
 *
 * Substitui a checagem antiga, que aceitava 'trial' sem olhar data nenhuma.
 */
create or replace function public.clinica_tem_acesso(p_clinica_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case c.status
    when 'active' then true
    when 'trial'  then coalesce(c.trial_termina_em, current_date) >= current_date
    else false
  end
  from public.clinicas c
  where c.id = p_clinica_id;
$$;

revoke all on function public.clinica_tem_acesso(uuid) from public;
grant execute on function public.clinica_tem_acesso(uuid) to authenticated, service_role;

-- ----------------------------------------------- cadastro com data de teste
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

  -- A data de fim do teste e gravada no cadastro, calculada no fuso do
  -- negocio. Deixar para calcular na leitura significaria que uma mudanca de
  -- regra amanha encurtaria o teste de quem ja esta dentro.
  insert into public.clinicas (
    nome, nome_fantasia, email, telefone, cidade, estado, status, plano, trial_termina_em
  )
  values (
    btrim(p_clinica_nome),
    btrim(p_clinica_nome),
    v_email,
    nullif(btrim(coalesce(p_telefone, '')), ''),
    nullif(btrim(coalesce(p_cidade, '')), ''),
    nullif(upper(btrim(coalesce(p_estado, ''))), ''),
    'trial',
    'trial',
    (now() at time zone 'America/Sao_Paulo')::date + 7
  )
  returning id into v_clinica_id;

  insert into public.usuarios (auth_user_id, clinica_id, nome, email, role)
  values (v_auth_user_id, v_clinica_id, btrim(p_usuario_nome), v_email, 'owner');

  insert into public.assinaturas (clinica_id, status, plano, valor)
  values (v_clinica_id, 'trial', 'trial', 0)
  on conflict (clinica_id) do nothing;

  return v_clinica_id;
end;
$$;

revoke all on function public.criar_clinica_com_usuario(text, text, text, text, text) from public;
grant execute on function public.criar_clinica_com_usuario(text, text, text, text, text)
  to authenticated;

-- O usuario pode ler o proprio plano, mas nao escrever: sem esta revogacao,
-- bastaria um UPDATE pelo PostgREST para virar 'scale' de graca.
revoke update on public.clinicas from authenticated;
grant update (nome, nome_fantasia, documento, email, telefone, cidade, estado)
  on public.clinicas to authenticated;
