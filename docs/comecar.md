# Colocando o GlowScale para rodar

Este guia leva do repositorio clonado ate a primeira clinica funcionando, com
dados reais. Leva cerca de cinco minutos e a maior parte e esperar o Supabase
provisionar o projeto.

O GlowScale nao roda sem um banco: ele guarda clinicas, profissionais e
atendimentos no Supabase, que tambem cuida da autenticacao. Enquanto as
credenciais nao estiverem no lugar, as telas de login e cadastro mostram o que
falta em vez do formulario.

---

## 1. Criar o projeto no Supabase

1. Acesse <https://supabase.com/dashboard> e crie um projeto (o plano gratuito
   basta).
2. Guarde a senha do banco que ele pedir - o painel nao mostra de novo.
3. Espere o provisionamento terminar (1 a 2 minutos).

## 2. Copiar as credenciais

No projeto, va em **Project Settings -> API** e copie:

| No painel | Vai para |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| chave `publishable` (ou `anon`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| chave `service_role` | `SUPABASE_SERVICE_ROLE_KEY` |

Crie o arquivo `.env.local` na raiz do projeto:

```bash
cp .env.local.example .env.local
```

E preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

A `service_role` so e necessaria para a cobranca. Sem ela o resto funciona
normalmente, porque a clinica nasce em periodo de teste.

## 3. Criar as tabelas

No painel do Supabase, abra o **SQL Editor** e execute, **nesta ordem**:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_funcoes_relatorio.sql`

Cole o conteudo de cada arquivo, rode, confira que terminou sem erro e so
entao passe para o proximo. Mensagens de `NOTICE ... does not exist, skipping`
sao esperadas: sao os `drop policy if exists` do inicio.

Pular este passo e o segundo tropeco mais comum. Se acontecer, o cadastro vai
avisar que o banco nao tem o schema do GlowScale.

## 4. Desligar a confirmacao de e-mail (para testar mais rapido)

Por padrao o Supabase exige confirmar o e-mail antes de liberar a sessao. Isso
funciona, mas obriga a sair da aplicacao e abrir a caixa de entrada a cada
teste.

Para avaliar o produto de uma vez so:

**Authentication -> Sign In / Providers -> Email** e desligue
**Confirm email**.

Os dois caminhos funcionam. Com a confirmacao ligada, o cadastro mostra
"Confirme seu e-mail"; depois de clicar no link voce cai em `/onboarding` e
conclui a criacao da clinica. Em producao, deixe ligada.

Ainda em **Authentication -> URL Configuration**, adicione em
**Redirect URLs**:

```
http://localhost:3000/auth/callback
```

## 5. Subir

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

---

## O que acontece depois do cadastro

```
/cadastro
   -> cria o usuario no Supabase Auth
   -> a funcao criar_clinica_com_usuario cria clinica + perfil owner
      na mesma transacao, e ja abre a assinatura como "pendente"
   -> /assinatura   (a clinica nasce em periodo de teste)
   -> "Ir para o painel"
   -> /dashboard
```

A clinica nasce com status `trial`, e `trial` libera o painel. **Voce nao
precisa configurar o Asaas para usar o sistema** - a tela de assinatura existe
para quando quiser cobrar de verdade.

No painel, a ordem que faz o produto fazer sentido:

1. **Profissionais** - cadastre ao menos uma, com o percentual de comissao.
2. **Procedimentos** - cadastre ao menos um, com valor e duracao.
3. **Atendimentos** - lance um. Ao escolher o procedimento o valor vem
   preenchido; a previa mostra quanto e comissao e quanto fica para a clinica
   **antes** de salvar.
4. **Escala** - monte a semana; clique num dia vazio para adicionar turno.
5. **Financeiro** - o consolidado por profissional aparece com filtro de
   periodo.
6. **Dashboard** - faturamento do mes, ranking e proximos turnos.

O calculo de comissao e congelado no atendimento: mudar depois o percentual da
profissional **nao** reescreve o que ja foi lancado. Da para testar isso -
lance um atendimento a 40%, mude a profissional para 50% e confira que o
lancamento antigo continua com 40%.

## Quer ver com dados prontos?

`supabase/seed.sql` cria uma clinica de demonstracao com profissionais,
procedimentos, uma semana de escala e doze atendimentos. Rode no SQL Editor e
depois aponte seu usuario para ela:

```sql
update public.usuarios
   set clinica_id = '11111111-1111-4111-8111-111111111111'
 where email = 'seu-email@exemplo.com';
```

Recarregue o painel: dashboard, financeiro e escala ja aparecem preenchidos.

---

## Se algo falhar

| Tela mostra | Causa | O que fazer |
| --- | --- | --- |
| "Falta conectar o banco de dados" | `.env.local` ausente ou vazio | Passo 2, depois reinicie o servidor |
| "O banco conectado ainda não tem o schema" | migrations nao rodaram | Passo 3 |
| "Confirme seu e-mail" | confirmacao ligada | Clique no link do e-mail, ou passo 4 |
| "E-mail ou senha incorretos" | credenciais erradas | Use "Esqueci minha senha" |
| Cobranca "nao configurada" | sem chave do Asaas | Esperado; nao bloqueia o uso |

Variaveis `NEXT_PUBLIC_*` sao lidas quando o servidor sobe. Depois de mexer no
`.env.local`, **reinicie** - `Ctrl+C` e `npm run dev` de novo.
