# Seguranca e isolamento multi-tenant

O GlowScale trata isolamento como problema de banco, nao de interface. Mesmo que a
aplicacao inteira tivesse um bug de autorizacao, o PostgreSQL continuaria recusando
leitura e escrita cruzada entre clinicas.

---

## 1. O modelo do tenant

```
auth.users ──1:1──> usuarios ──N:1──> clinicas
                                          │
                     ┌────────────────────┼────────────────────┐
              profissionais         procedimentos          assinaturas
                     │                    │
                     └──── atendimentos ──┘
                     └──── escalas
```

Toda tabela de negocio carrega `clinica_id uuid NOT NULL` com FK para `clinicas`.

## 2. A funcao que resolve o tenant

```sql
create or replace function public.get_user_clinica_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.clinica_id
  from public.usuarios u
  where u.auth_user_id = (select auth.uid())
    and u.ativo = true
  limit 1;
$$;
```

Tres detalhes deliberados:

- **`SECURITY DEFINER`** - a funcao le `usuarios` sem disparar a policy que a chama.
  Sem isso, a policy de `usuarios` entraria em recursao infinita.
- **`set search_path` fixo** - impede sequestro de resolucao de nomes por um schema
  malicioso no `search_path` da sessao.
- **`revoke ... from public`** seguido de `grant execute to authenticated` - so quem
  esta autenticado executa.

As policies chamam `(select public.get_user_clinica_id())`. O `select` faz o
PostgreSQL avaliar a funcao uma vez por query (InitPlan), em vez de uma vez por
linha.

## 3. Policies

Para `profissionais`, `procedimentos`, `atendimentos` e `escalas`, as quatro
operacoes seguem o mesmo padrao:

```sql
using       (clinica_id = (select public.get_user_clinica_id()))  -- SELECT/UPDATE/DELETE
with check  (clinica_id = (select public.get_user_clinica_id()))  -- INSERT/UPDATE
```

`USING` sem `WITH CHECK` deixaria um `UPDATE` mover uma linha para outra clinica.
Por isso as duas clausulas existem.

`clinicas` e `usuarios` tem policies proprias; `assinaturas` so tem policy de
`SELECT`; `asaas_webhook_eventos` nao tem policy nenhuma (exclusiva da service role).

## 4. Privilegios por coluna

RLS decide **quais linhas**. Nao decide **quais colunas**. Um usuario poderia,
via PostgREST, tentar:

```
PATCH /rest/v1/clinicas?id=eq.<sua-clinica>   { "status": "active" }
```

A linha e dele, entao a policy permitiria. A defesa e o grant:

```sql
revoke all on public.clinicas from anon, authenticated;
grant select on public.clinicas to authenticated;
grant update (nome, nome_fantasia, documento, email, telefone, cidade, estado)
  on public.clinicas to authenticated;
```

`status` esta fora da lista. A tentativa acima falha com erro de privilegio.

O mesmo raciocinio se aplica a `usuarios`: `grant update (nome)` apenas - ninguem
muda o proprio `role` nem o proprio `clinica_id`.

E a `assinaturas`: `grant select` e nada mais. Toda escrita passa por
`lib/supabase/admin.ts` (service role) a partir do webhook ou das actions de
assinatura.

## 5. Integridade referencial entre tenants

`profissionais` e `procedimentos` tem `UNIQUE (id, clinica_id)`, o que permite FKs
compostas:

```sql
constraint atendimentos_profissional_mesma_clinica
  foreign key (profissional_id, clinica_id)
  references public.profissionais (id, clinica_id) on delete restrict
```

Resultado: e **impossivel** gravar um atendimento apontando para uma profissional de
outra clinica. Nao e uma checagem da aplicacao que pode ser esquecida - e uma
constraint.

## 6. Constraints de negocio no banco

| Tabela | Constraint |
| --- | --- |
| `profissionais` | `percentual_comissao between 0 and 100` |
| `procedimentos` | `valor >= 0`, `duracao_minutos between 1 and 1440` |
| `atendimentos` | `quantidade > 0 and <= 1000`, `valor_unitario >= 0`, `comissao_percentual between 0 and 100` |
| `escalas` | `hora_inicio < hora_fim`, turno unico por profissional/data/horario |
| `assinaturas` | `valor >= 0`, `data_fim >= data_inicio`, uma assinatura por clinica |

E o calculo financeiro nao e gravavel: `valor_total`, `valor_comissao` e
`valor_clinica` sao `GENERATED ALWAYS AS ... STORED`.

## 7. Autorizacao na aplicacao

- `proxy.ts` renova a sessao e barra usuarios nao autenticados antes de qualquer
  Server Component rodar.
- `requireActiveSubscription()` (`lib/auth/session.ts`) e o gate do painel:
  autenticado + perfil + clinica + status que libera o uso.
- Rotas deliberadamente **fora** do gate: `/login`, `/cadastro`,
  `/recuperar-senha`, `/redefinir-senha`, `/auth/callback`, `/onboarding`,
  `/assinatura` e o webhook.
- Nenhuma action confia em `clinica_id` vindo do formulario. Ele sai da sessao, e as
  queries ainda filtram por ele explicitamente.
- O `comissao_percentual` de um atendimento e lido do banco no servidor. Se viesse
  do formulario, qualquer cliente poderia lancar 0% de comissao.

## 8. Segredos

| Segredo | Onde vive | Nunca |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` (`server-only`) | prefixo `NEXT_PUBLIC_`, log, resposta HTTP |
| `ASAAS_API_KEY` | `lib/asaas/config.ts` (`server-only`) | browser, log, mensagem de erro |
| `ASAAS_WEBHOOK_TOKEN` | `lib/asaas/webhooks.ts` (`server-only`) | comparacao com `===` (usa `timingSafeEqual`) |

O `import "server-only"` faz o build **falhar** se um desses modulos for importado
por um Client Component. Nao e convencao: e erro de compilacao.

## 9. Tratamento de erro

`lib/actions/result.ts` centraliza a conversao de excecao em resposta:

- codigos do PostgREST viram mensagens uteis (`23505` -> "Ja existe um registro com
  esses dados");
- qualquer outro erro vira uma mensagem generica;
- o detalhe tecnico vai para `console.error` no servidor, com codigo e mensagem,
  sem payload nem credencial;
- o usuario nunca ve stack trace.

Na autenticacao, a recuperacao de senha responde sempre a mesma coisa, exista ou nao
a conta - evita enumeracao de e-mails.

---

## Como validar o isolamento na pratica

Os testes automatizados cobrem calculo, validacao e webhook. Testar RLS de verdade
exige um banco com as migrations aplicadas e **dois usuarios de Auth reais**, por
isso o roteiro e manual:

1. Aplique `001` e `002` num projeto Supabase limpo.
2. Crie duas contas pela tela `/cadastro`: `clinica-a@teste.com` e
   `clinica-b@teste.com`. Cada uma nasce com a propria clinica.
3. Logado como A, cadastre uma profissional e um atendimento.
4. Pegue o `id` da clinica de A e o `id` da profissional de A (via SQL Editor).
5. Logado como B, no navegador, abra o console e tente ler os dados de A:

```js
// Deve devolver lista vazia - RLS filtra, nao da erro.
const { data } = await window.__supabase
  .from("profissionais")
  .select("*")
  .eq("clinica_id", "<ID_DA_CLINICA_A>");
console.log(data); // []
```

6. Tente escrever na clinica de A:

```js
// Deve falhar: violacao da policy de INSERT.
await window.__supabase.from("profissionais").insert({
  clinica_id: "<ID_DA_CLINICA_A>",
  nome: "Invasora",
  percentual_comissao: 50,
});
```

7. Tente ativar a propria assinatura sem pagar:

```js
// Deve falhar: nao existe policy de UPDATE em assinaturas para authenticated.
await window.__supabase
  .from("assinaturas")
  .update({ status: "active" })
  .eq("clinica_id", "<ID_DA_CLINICA_B>");
```

8. Tente mudar o proprio status de clinica:

```js
// Deve falhar: a coluna status nao esta no grant de UPDATE.
await window.__supabase
  .from("clinicas")
  .update({ status: "active" })
  .eq("id", "<ID_DA_CLINICA_B>");
```

Os passos 5 a 8 sao o criterio de aceite do isolamento. Se qualquer um deles
funcionar, ha regressao nas migrations.

Alternativa em SQL puro, sem navegador (dentro de uma transacao):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub": "<AUTH_USER_ID_DA_CLINICA_B>", "role": "authenticated"}';

select * from public.profissionais;                 -- so linhas da clinica B
select public.get_user_clinica_id();                -- id da clinica B

insert into public.profissionais (clinica_id, nome, percentual_comissao)
values ('<ID_DA_CLINICA_A>', 'Invasora', 50);       -- deve falhar

rollback;
```
