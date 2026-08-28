# Cobranca com Stripe

O GlowScale cobra a mensalidade por **Stripe Checkout hospedado**. A aplicacao
cria a sessao e redireciona; a pagina de pagamento e do Stripe. Nenhum dado de
cartao passa pelo nosso servidor, o que mantem a instalacao fora do escopo de
PCI e dispensa guardar qualquer coisa sensivel.

## Configuracao em 4 passos

### 1. Criar o produto e o preco

Painel do Stripe > **Product catalog** > **Add product**:

- Nome: `GlowScale - Essencial` (ou o que preferir)
- Preco: o valor mensal, moeda **BRL**
- Cobranca: **Recurring**, intervalo **Monthly**

Salve e copie o **ID do preco** - comeca com `price_`, nao com `prod_`. Essa
distincao derruba muita gente: `prod_` identifica o produto, `price_` identifica
quanto e com que frequencia cobrar, e e o segundo que o checkout usa.

### 2. Preencher as variaveis

```bash
PAGAMENTO_PROVEDOR=stripe
STRIPE_SECRET_KEY=sk_test_...      # Developers > API keys > Secret key
STRIPE_PRICE_ID=price_...          # do passo 1
STRIPE_WEBHOOK_SECRET=whsec_...    # do passo 3
SUPABASE_SERVICE_ROLE_KEY=...      # o webhook escreve com ela
```

Nenhuma delas leva prefixo `NEXT_PUBLIC_`. O fluxo hospedado nao precisa de
chave publicavel do Stripe: o browser so recebe uma URL de redirect.

### 3. Registrar o webhook

Painel > **Developers** > **Webhooks** > **Add endpoint**:

- URL: `https://SEU-DOMINIO/api/webhooks/stripe`
- Eventos:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

Copie o **Signing secret** (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`.

Sem esse segredo o endpoint **recusa todos os eventos**, e nao e um bug: a
assinatura do header e a unica prova de que o request veio do Stripe. Aceitar
sem conferir permitiria a qualquer um que descobrisse a URL marcar a propria
clinica como paga.

### 4. Aplicar a migration

Cole `supabase/instalar.sql` no SQL Editor do Supabase. Ele ja inclui a
migration `003_stripe.sql`.

## Testar sem cobrar de verdade

Com uma chave `sk_test_`, a interface mostra um aviso de modo de teste e o
cartao `4242 4242 4242 4242` (validade futura, CVC qualquer) aprova.

Para receber webhooks na maquina local:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

O `stripe listen` imprime um `whsec_` proprio - use **esse** no `.env.local`
enquanto desenvolve, nao o do painel.

## Como o estado e mantido

| Status no Stripe     | Assinatura   | Acesso da clinica |
| -------------------- | ------------ | ----------------- |
| `active`             | `active`     | liberado          |
| `trialing`           | `trial`      | liberado          |
| `past_due`           | `past_due`   | bloqueado         |
| `unpaid` / `paused`  | `past_due`   | bloqueado         |
| `canceled`           | `canceled`   | bloqueado         |
| `incomplete_expired` | `expired`    | bloqueado         |
| `incomplete`         | `pending`    | **inalterado**    |

A ultima linha e deliberada. `incomplete` significa "abriu o checkout e ainda
nao concluiu". Derrubar o acesso ali tiraria do ar uma clinica que esta em
periodo de teste e apenas comecou a assinar.

Um status desconhecido tambem nao libera nada: cai em `pending` sem mexer no
acesso. Se o Stripe introduzir um estado novo, o pior caso e nao reagir - nunca
liberar por engano.

### Garantias do webhook

1. **Autenticidade** - `stripe.webhooks.constructEvent` confere a assinatura em
   tempo constante e recusa payloads fora da janela de tolerancia (replay).
2. **Idempotencia** - o `event_id` e gravado em `stripe_webhook_eventos` com
   unique constraint. O Stripe reentrega por design; a reentrega vira `duplicado`.
3. **Minimo privilegio** - a escrita usa service role porque nao existe sessao
   no request. O `authenticated` **nao** tem INSERT/UPDATE em `assinaturas`, entao
   ninguem consegue se marcar como `active` pelo PostgREST e usar de graca.

O corpo e lido como texto cru: um `request.json()` reserializaria os bytes e
invalidaria a conferencia da assinatura.

## De onde vem o preco mostrado na tela

Da propria API do Stripe (`prices.retrieve` do `STRIPE_PRICE_ID`), nao de uma
constante local. Com dois lugares definindo preco, um dia a vitrine anuncia um
valor e o cartao e cobrado outro. Se a leitura falhar, `NEXT_PUBLIC_PLANO_VALOR`
cobre a exibicao - errar o rotulo e melhor do que derrubar justamente a pagina
onde a cliente vai regularizar o pagamento.

## Portal do cliente

O botao "Gerenciar pagamento e faturas" abre o **Billing Portal**: trocar cartao,
ver faturas, cancelar. Habilite uma vez em **Settings > Billing > Customer portal**.
Sem ele, cada um desses pedidos vira trabalho manual do suporte.

## Conviver com o Asaas

Os dois provedores coexistem. `PAGAMENTO_PROVEDOR` decide (`stripe` ou `asaas`);
sem ela, vale o que estiver configurado, com preferencia para o Stripe.

A escolha e do ambiente, nunca do navegador - aceitar o provedor vindo do
cliente permitiria pedir checkout num provedor sem credencial.

Cada provedor tem colunas proprias em `assinaturas` (`stripe_customer_id` e
`asaas_customer_id`, e assim por diante) e tabela propria de eventos. Dividir as
mesmas colunas economizaria espaco e criaria a chance de um id de um provedor ser
lido como do outro - o tipo de bug que so aparece em producao, com dinheiro no meio.
