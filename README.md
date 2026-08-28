# GlowScale

SaaS B2B de gestao de escalas, atendimentos e comissoes para clinicas de estetica.

O GlowScale resolve uma pergunta que a maioria das clinicas responde no caderno:
**quanto cada profissional produziu, quanto ela recebe de comissao e quanto sobra
para a clinica.** Escala semanal, lancamento de atendimentos, calculo automatico de
comissao com snapshot historico e relatorio financeiro por periodo e por profissional.

## Sumario

- [Stack](#stack)
- [Como funciona o produto](#como-funciona-o-produto)
- [Instalacao](#instalacao)
- [Configuracao do Supabase](#configuracao-do-supabase)
- [Configuracao do Asaas](#configuracao-do-asaas)
- [Variaveis de ambiente](#variaveis-de-ambiente)
- [Migrations e seed](#migrations-e-seed)
- [Cobranca (Stripe ou Asaas)](#cobranca-stripe-ou-asaas)
- [Desenvolvimento, testes e build](#desenvolvimento-testes-e-build)
- [Verificando o banco de verdade](#verificando-o-banco-de-verdade)
- [Marca](#marca)
- [Deploy](#deploy)
- [Arquitetura](#arquitetura)
- [Seguranca](#seguranca)
- [Limitacoes atuais](#limitacoes-atuais)

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Linguagem | TypeScript em modo strict (`noUncheckedIndexedAccess` ligado) |
| UI | Tailwind CSS v4, componentes shadcn/ui, Radix UI, Lucide React |
| Banco | Supabase (PostgreSQL + Auth + Row Level Security) |
| Validacao | Zod v4 (mesmos schemas no cliente e no servidor) |
| Formularios | React Hook Form + `@hookform/resolvers/zod` |
| Datas | date-fns v4 + `@date-fns/tz` (fuso de negocio `America/Sao_Paulo`) |
| Pagamentos | Asaas (assinaturas recorrentes por PIX, cartao ou boleto + webhook) |
| Testes | Vitest |

---

## Como funciona o produto

```
Cadastro -> criacao da clinica -> criacao do usuario owner
         -> verificacao da assinatura -> /assinatura -> /dashboard
```

Areas do painel:

- **Dashboard** - faturamento, comissoes, repasse da clinica e atendimentos do mes,
  ranking das profissionais que mais faturaram e proximos turnos.
- **Profissionais** - CRUD completo com especialidade e percentual de comissao.
- **Escala** - grade semanal (segunda a domingo) com multiplos turnos por dia,
  navegacao entre semanas e visao em cards no mobile.
- **Procedimentos** - CRUD com valor e duracao padrao.
- **Atendimentos** - lancamento com preenchimento automatico de valor, previa da
  comissao antes de salvar e filtros por periodo, profissional e status.
- **Financeiro** - consolidado do periodo com quebra por profissional.
- **Configuracoes** - dados cadastrais da clinica e situacao da assinatura.

### A regra financeira central

```
valor_total    = round(valor_unitario * quantidade, 2)
valor_comissao = round(valor_total * (comissao_percentual / 100), 2)
valor_clinica  = valor_total - valor_comissao
```

Duas decisoes importantes:

1. **O percentual e congelado no atendimento.** Mudar a comissao de uma profissional
   nunca reescreve lancamentos antigos. O servidor le o percentual vigente direto do
   banco no momento do lancamento - ele nunca vem do formulario.
2. **O calculo mora no banco.** `valor_total`, `valor_comissao` e `valor_clinica` sao
   colunas `GENERATED ALWAYS AS ... STORED`. Nem uma chamada direta ao PostgREST
   consegue gravar um atendimento com matematica inconsistente. A funcao
   `calculateCommission()` no TypeScript reproduz exatamente a mesma formula (em
   centavos inteiros) para que a previa da tela case com o valor persistido.

---

## Instalacao

> Primeira vez? [`docs/comecar.md`](docs/comecar.md) leva do clone ate a
> primeira clinica funcionando, e lista os tropecos comuns.

Requisitos: Node.js 20+ e uma conta Supabase.

```bash
cd glowscale
npm install
cp .env.local.example .env.local   # preencha os valores
npm run dev
```

A aplicacao sobe em `http://localhost:3000`.

---

## Configuracao do Supabase

1. Crie um projeto em <https://supabase.com>.
2. Em **Project Settings > API**, copie:
   - `Project URL` para `NEXT_PUBLIC_SUPABASE_URL`;
   - a chave publica (`publishable` / `anon`) para `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
   - a `service_role` para `SUPABASE_SERVICE_ROLE_KEY` (**somente servidor**).
3. Em **Authentication > URL Configuration**, adicione as URLs de redirecionamento:
   - `http://localhost:3000/auth/callback`
   - `https://SEU-DOMINIO/auth/callback`
4. Ainda em **Authentication > Providers > Email**, decida se a confirmacao de
   e-mail fica ligada. Os dois fluxos funcionam:
   - **desligada** - o cadastro ja cria clinica e perfil e leva para `/assinatura`;
   - **ligada** - o cadastro pede confirmacao; ao confirmar, o usuario cai em
     `/onboarding` e conclui a criacao da clinica.
5. Rode o schema: cole `supabase/instalar.sql` no SQL Editor (secao seguinte).

---

## Cobranca (Stripe ou Asaas)

A mensalidade pode ser cobrada por **Stripe** ou **Asaas**. `PAGAMENTO_PROVEDOR`
decide (`stripe` | `asaas`); sem ela, vale o que estiver configurado, com
preferencia para o Stripe.

O Stripe usa **Checkout hospedado**: a aplicacao cria a sessao e redireciona,
entao nenhum dado de cartao passa pelo servidor. O passo a passo completo -
criar o preco, registrar o webhook, testar sem cobrar de verdade e a tabela de
status - esta em [docs/stripe.md](docs/stripe.md).

Resumo das variaveis (nenhuma leva `NEXT_PUBLIC_`):

```bash
PAGAMENTO_PROVEDOR=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...        # o preco recorrente, nao o produto
STRIPE_WEBHOOK_SECRET=whsec_...
```

Depois de um build, `npm run auditar:segredos` confere que nenhum formato de
credencial foi parar no bundle do navegador.

---

## Configuracao do Asaas

1. Crie a conta em <https://www.asaas.com> e gere a API Key.
   - **Sandbox**: <https://sandbox.asaas.com> > Integracoes > API Key ->
     coloque em `ASAAS_API_KEY` com `ASAAS_ENVIRONMENT=sandbox`.
   - **Producao**: mesma tela no painel de producao -> `ASAAS_API_KEY` com
     `ASAAS_ENVIRONMENT=production`.
   - As URLs base sao derivadas do ambiente
     (`https://api-sandbox.asaas.com/v3` e `https://api.asaas.com/v3`) e podem ser
     sobrescritas por `ASAAS_BASE_URL`.
2. Configure o webhook em **Integracoes > Webhooks**:
   - URL: `https://SEU-DOMINIO/api/webhooks/asaas`
   - Token de autenticacao: gere um valor aleatorio e coloque **o mesmo** em
     `ASAAS_WEBHOOK_TOKEN`. O endpoint compara o header `asaas-access-token` em
     tempo constante e recusa qualquer requisicao sem token valido.
   - Eventos: cobranca (`PAYMENT_*`) e assinatura (`SUBSCRIPTION_*`).
3. A API Key **nunca** vai para o browser. Nao existe `NEXT_PUBLIC_ASAAS_*` no
   projeto, e o `lib/asaas/*` inteiro e marcado com `import "server-only"`.

Enquanto `ASAAS_API_KEY` nao estiver configurada, o restante do sistema continua
funcionando normalmente (a clinica nasce em `trial`) e a tela `/assinatura` explica
o que falta configurar, em vez de quebrar.

Detalhes dos endpoints usados e das suposicoes documentadas: [`docs/asaas.md`](docs/asaas.md).

---

## Variaveis de ambiente

Copie de `.env.local.example`. Nenhum valor real e versionado.

| Variavel | Obrigatoria | Onde roda | Para que serve |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | cliente + servidor | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | cliente + servidor | Chave publica (respeita RLS) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | nao | cliente + servidor | Alternativa ao nome acima, para projetos antigos |
| `SUPABASE_SERVICE_ROLE_KEY` | para cobranca | **so servidor** | Webhook e escrita de assinatura |
| `ASAAS_ENVIRONMENT` | para cobranca | so servidor | `sandbox` ou `production` |
| `ASAAS_API_KEY` | para cobranca | **so servidor** | Autenticacao na API do Asaas |
| `ASAAS_WEBHOOK_TOKEN` | para cobranca | **so servidor** | Validacao do webhook |
| `ASAAS_BASE_URL` | nao | so servidor | Sobrescreve a URL base do ambiente |
| `NEXT_PUBLIC_APP_URL` | recomendada | cliente + servidor | Links de e-mail, canonical e sitemap |
| `NEXT_PUBLIC_PLANO_NOME` | nao | cliente + servidor | Nome do plano exibido |
| `NEXT_PUBLIC_PLANO_VALOR` | nao | cliente + servidor | Valor mensal do plano |

---

## Migrations e seed

As migrations sao SQL puro, na ordem numerica:

- `supabase/migrations/001_initial_schema.sql` - extensoes, enums, tabelas,
  constraints, indices, triggers de `updated_at`, funcoes de contexto do tenant,
  grants por coluna e todas as policies de RLS.
- `supabase/migrations/002_funcoes_relatorio.sql` - funcoes de consolidacao
  financeira (`relatorio_financeiro` e `resumo_financeiro`).
- `supabase/migrations/003_stripe.sql` - colunas e tabela de eventos do Stripe,
  mantendo as do Asaas intactas.
- `supabase/seed.sql` - clinica de demonstracao com profissionais, procedimentos,
  atendimentos e escala da semana corrente. Nao cria usuarios de Auth.

Para facilitar o primeiro setup, `supabase/instalar.sql` traz as duas migrations
concatenadas na ordem, num arquivo so. E gerado por `npm run sql:instalar` - as
migrations continuam sendo a fonte; nao edite o arquivo gerado.

**Opcao A - SQL Editor do Supabase** (mais rapido): cole `supabase/instalar.sql`
inteiro e execute. Rodar de novo e seguro: todo o DDL e `if not exists` ou
`create or replace`.

**Opcao B - Supabase CLI**:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push          # aplica as migrations
psql "$DATABASE_URL" -f supabase/seed.sql   # opcional
```

**Opcao C - psql direto**:

```bash
psql "$DATABASE_URL" -f supabase/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/002_funcoes_relatorio.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

Para ver os dados de demonstracao logado na aplicacao, crie sua conta em `/cadastro`
e depois aponte o perfil para a clinica de demonstracao:

```sql
update public.usuarios
   set clinica_id = '11111111-1111-4111-8111-111111111111'
 where email = 'seu-email@exemplo.com';
```

### Tipos do banco

`types/database.ts` espelha o schema a mao. Com o CLI disponivel, da para regerar:

```bash
npx supabase gen types typescript --project-id SEU_REF --schema public > types/database.ts
```

---

## Desenvolvimento, testes e build

```bash
npm run doutor     # diagnostica a instalacao (env, conexao, schema)
npm run dev        # servidor de desenvolvimento
npm run lint       # ESLint (flat config + regras do React Compiler)
npm run typecheck  # tsc --noEmit
npm run test       # Vitest
npm run build      # build de producao
npm start          # serve o build
```

Os testes cobrem as regras que nao podem errar: calculo de comissao (incluindo 0%,
100%, quantidade > 1 e arredondamento), aritmetica monetaria em centavos, schemas
Zod, utilitarios de data com fuso e a traducao dos eventos de webhook do Asaas.

---

## Verificando o banco de verdade

As migrations, o RLS e a matematica financeira nao precisam ser aceitos por
confianca. `scripts/verificar-banco.sh` sobe um PostgreSQL local, recria o
minimo do ambiente Supabase (schema `auth`, `auth.uid()`, papeis
`anon`/`authenticated`/`service_role` e as default privileges amplas que o
Supabase concede), aplica as migrations e exercita o que a documentacao afirma:

```bash
./scripts/verificar-banco.sh
```

Ele confere, entre outros pontos, que uma clinica autenticada **nao** consegue:
ler linhas de outra clinica, inserir registros nela, ativar a propria
assinatura, mudar o proprio `status`, migrar de tenant, se promover a `owner`,
ler a tabela de eventos do webhook ou gravar valores nas colunas financeiras
geradas. Tambem confirma que a FK composta barra vinculo cruzado mesmo para
superusuario - onde o RLS nem chega a ser consultado.

Requer `postgresql-16` e `psql` no PATH.

## Marca

O monograma **GS**, a paleta e as regras de uso estao em
[`docs/marca.md`](docs/marca.md). Os mesmos dois `path` do desenho vivem em
tres arquivos (`components/layout/glowscale-mark.tsx`, `app/icon.svg` e as
imagens sociais) - ao mexer na marca, mexa nos tres.

## Deploy

O projeto roda em qualquer plataforma que suporte Next.js 16 (Vercel, Render, Fly,
container proprio). Na Vercel:

1. Importe o repositorio `arthukkj7/glowscale`.
2. Cadastre as variaveis de ambiente da tabela acima
   (`SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` como
   secrets, nunca com prefixo `NEXT_PUBLIC_`).
3. Depois do primeiro deploy, ajuste `NEXT_PUBLIC_APP_URL`, as URLs de redirect no
   Supabase Auth e a URL do webhook no painel do Asaas.

---

## Arquitetura

```
glowscale/
├── app/
│   ├── (auth)/                  login, cadastro, recuperar-senha, redefinir-senha
│   ├── (dashboard)/             dashboard, profissionais, procedimentos, escala,
│   │                            atendimentos, financeiro, configuracoes
│   ├── api/webhooks/asaas/      route handler do webhook
│   ├── assinatura/              checkout (acessivel sem assinatura ativa)
│   ├── auth/callback/           troca do code por sessao
│   ├── onboarding/              criacao de clinica apos confirmacao de e-mail
│   ├── icon.svg                 favicon (com variante para tema escuro)
│   ├── apple-icon.png           icone iOS
│   ├── opengraph-image.png      imagem social (+ .alt.txt)
│   ├── layout.tsx, page.tsx, error.tsx, not-found.tsx, robots.ts, sitemap.ts
│
├── components/
│   ├── ui/                      primitivos shadcn/ui
│   ├── shared/                  PageHeader, StatCard, DataTable, EmptyState,
│   │                            LoadingState, ErrorState, ConfirmDialog,
│   │                            CurrencyInput, DatePicker, FormField, Pagination,
│   │                            StatusBadge, FiltrosPeriodo
│   ├── layout/                  sidebar, header, menu do usuario, navegacao mobile
│   └── auth/ profissionais/ procedimentos/ escala/ atendimentos/ configuracoes/
│
├── lib/
│   ├── supabase/                client (browser), server (RSC/actions),
│   │                            admin (service role), proxy (sessao + rotas)
│   ├── asaas/                   config, client HTTP, customers, subscriptions, webhooks
│   ├── actions/                 Server Actions + contrato ActionResult
│   ├── data/                    consultas server-side por tenant
│   ├── calculations/            money.ts, commission.ts
│   ├── validations/             schemas Zod
│   ├── auth/session.ts          getEstadoSessao, requireActiveSubscription
│   ├── utils/                   date.ts, filtros.ts
│   └── constants/
│
├── scripts/verificar-banco.sh   verificacao de RLS e financeiro em PG real
├── supabase/migrations/, supabase/seed.sql
├── tests/
├── types/database.ts
└── proxy.ts                     proxy do Next 16 (antigo middleware)
```

Decisoes que valem explicacao:

- **Server Components por padrao.** Client Components aparecem so onde ha
  interatividade real: dialogos de formulario, menus e toasts.
- **Filtros no banco.** As telas de atendimentos e financeiro montam `WHERE` no
  PostgreSQL. A consolidacao por profissional e um `GROUP BY` dentro da funcao
  `relatorio_financeiro`, entao o navegador recebe linhas agregadas, nao a base toda.
- **Paginacao server-side** com `range()` + `count: "exact"` nas listagens que
  podem crescer.
- **Datas de negocio circulam como `yyyy-MM-dd`** e so viram `Date` na formatacao.
  Isso elimina a classe de bug em que um atendimento do dia 14 aparece como dia 13.
- **Um contrato unico de retorno** (`ActionResult`) para todas as Server Actions:
  sucesso com dados ou falha com mensagem segura. O detalhe tecnico vai para o log
  do servidor; o usuario nunca ve stack trace.

---

## Seguranca

Resumo (detalhamento em [`docs/seguranca.md`](docs/seguranca.md)):

- **RLS ativo em todas as tabelas de negocio.** As policies comparam o `clinica_id`
  do registro com o resultado de `get_user_clinica_id()`, uma funcao
  `SECURITY DEFINER` com `search_path` fixo que resolve o tenant a partir de
  `auth.uid()`.
- **Privilegios por coluna.** O papel `authenticated` recebe `UPDATE` apenas nas
  colunas de cadastro de `clinicas`. Nao ha como um cliente mudar o `status` da
  propria clinica para `active` chamando o PostgREST direto.
- **Assinaturas sao somente leitura para o usuario.** Todo `INSERT`/`UPDATE` em
  `assinaturas` passa pelo servidor com service role.
- **Integridade no banco.** FKs compostas `(id, clinica_id)` tornam impossivel
  vincular um atendimento a uma profissional de outra clinica. Constraints garantem
  comissao entre 0 e 100, quantidade > 0, valores >= 0 e `hora_inicio < hora_fim`.
- **Nada de ID vindo do navegador para autorizar.** O `clinica_id` sai sempre da
  sessao; as queries ainda filtram por ele explicitamente (defesa em profundidade).
- **Webhook autenticado e idempotente.** Token comparado com `timingSafeEqual` e
  `event_id` gravado com constraint `UNIQUE`.
- **Segredos so no servidor.** `SUPABASE_SERVICE_ROLE_KEY` e `ASAAS_API_KEY` vivem
  em modulos com `import "server-only"` e nunca aparecem em log nem em resposta.

---

## Limitacoes atuais

Coisas que dependem de configuracao externa ou de decisao futura, nao de codigo:

- **Credenciais.** Supabase e Asaas precisam ser preenchidos em `.env.local`. Sem a
  chave do Asaas o checkout mostra um aviso explicativo; o resto do sistema roda.
- **Um plano so.** O MVP oferece um plano unico, configuravel por env. Multiplos
  planos exigiriam uma tabela de planos.
- **Papeis `manager` e `professional`** existem no enum e o codigo ja consulta o
  papel, mas o MVP so exercita `owner` e `admin`.
- **Convite de novos usuarios** para uma clinica existente ainda nao tem tela; hoje
  o vinculo seria feito por SQL.
- **Testes de RLS** nao rodam no CI: exigem um banco PostgreSQL com as migrations
  aplicadas e dois usuarios de Auth reais. O roteiro manual para validar o
  isolamento cross-tenant esta em [`docs/seguranca.md`](docs/seguranca.md).
- **Sem tela de cancelamento de assinatura.** `cancelarAssinatura()` existe no
  service do Asaas, mas nao ha botao no painel.
