# Integracao Asaas

Este documento registra **exatamente** o que a integracao usa da API do Asaas e
quais suposicoes foram feitas, para que nada precise ser adivinhado depois.

Toda a integracao esta encapsulada em `lib/asaas/`. Nenhum outro modulo monta URL
ou header do Asaas.

```
lib/asaas/
├── config.ts         ambiente, URL base e leitura dos segredos
├── client.ts         cliente HTTP (auth, timeout, tratamento de erro)
├── customers.ts      clientes
├── subscriptions.ts  assinaturas e cobrancas
├── webhooks.ts       validacao, idempotencia e efeito dos eventos
└── types.ts          tipos das respostas efetivamente consumidas
```

---

## Ambientes

| `ASAAS_ENVIRONMENT` | URL base |
| --- | --- |
| `sandbox` (padrao) | `https://api-sandbox.asaas.com/v3` |
| `production` | `https://api.asaas.com/v3` |

`ASAAS_BASE_URL` sobrescreve as duas, para o caso de o Asaas mudar o host ou de
voce querer apontar para um mock em teste.

## Autenticacao

Header `access_token` com a API Key da conta, em toda requisicao.

A chave e lida **so** de `process.env.ASAAS_API_KEY`, dentro de um modulo marcado
com `import "server-only"`. Ela nunca entra em log: o `client.ts` registra apenas
metodo, rota, status e as descricoes de erro devolvidas pela API.

---

## Endpoints utilizados

| Metodo | Rota | Onde | Para que |
| --- | --- | --- | --- |
| `POST` | `/customers` | `customers.ts` | Cria o cliente da clinica |
| `GET` | `/customers/{id}` | `customers.ts` | Consulta cliente por id |
| `GET` | `/customers?externalReference=` | `customers.ts` | Reencontra o cliente da clinica |
| `POST` | `/subscriptions` | `subscriptions.ts` | Cria a assinatura recorrente |
| `GET` | `/subscriptions/{id}` | `subscriptions.ts` | Consulta o status remoto |
| `DELETE` | `/subscriptions/{id}` | `subscriptions.ts` | Cancela a assinatura |
| `GET` | `/subscriptions/{id}/payments` | `subscriptions.ts` | Descobre a fatura em aberto |

### Campos enviados

**Cliente** (`POST /customers`):
`name`, `cpfCnpj`, `email`, `mobilePhone`, `externalReference`, `notificationDisabled`.

**Assinatura** (`POST /subscriptions`):
`customer`, `billingType`, `value`, `nextDueDate`, `cycle`, `description`,
`externalReference`.

- `billingType`: `PIX`, `CREDIT_CARD` ou `BOLETO` (escolhido no checkout).
- `cycle`: `MONTHLY`.
- `nextDueDate`: hoje no fuso da clinica (`yyyy-MM-dd`).
- `externalReference`: **o `id` da clinica**. E o que permite o webhook reencontrar
  o tenant mesmo antes de a assinatura ter sido gravada localmente.

---

## Webhook

Endpoint: `POST /api/webhooks/asaas` (`app/api/webhooks/asaas/route.ts`).

### 1. Autenticidade

O Asaas envia o header `asaas-access-token` com o valor configurado no painel. O
endpoint compara com `ASAAS_WEBHOOK_TOKEN` usando `timingSafeEqual`.

Se `ASAAS_WEBHOOK_TOKEN` nao estiver configurado, **o evento e recusado** (401) e o
fato e logado. Nao existe modo "aceita tudo".

### 2. Idempotencia

O `id` do evento e inserido em `public.asaas_webhook_eventos`, que tem
`event_id text NOT NULL UNIQUE`. Uma reentrega colide com a constraint (`23505`) e
retorna `duplicado` sem reprocessar nada.

A tabela nao tem policy nem grant para `anon`/`authenticated`: so a service role
enxerga.

### 3. Identificacao do tenant

Nesta ordem:

1. `assinaturas.asaas_subscription_id` = id da assinatura do evento;
2. `assinaturas.asaas_customer_id` = id do cliente do evento;
3. `clinicas.id` = `externalReference` do evento.

Se nada casar, o evento e registrado, logado como sem correspondencia e ignorado -
nunca aplicado "no chute".

### 4. Efeito dos eventos

| Evento | `assinaturas.status` | `clinicas.status` |
| --- | --- | --- |
| `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_RECEIVED_IN_CASH` | `active` | `active` |
| `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE` | `past_due` | `past_due` |
| `SUBSCRIPTION_DELETED`, `SUBSCRIPTION_INACTIVATED` | `canceled` | `canceled` |
| Qualquer outro | registrado, sem efeito de status | - |

Somente `trial` e `active` liberam o painel (`CLINICA_STATUS_COM_ACESSO`).

### 5. Codigos de resposta

| Situacao | Status |
| --- | --- |
| Token invalido ou ausente | `401` |
| Service role nao configurada | `503` |
| JSON invalido ou evento sem `id`/`event` | `400` |
| Processado, duplicado ou ignorado | `200` |
| Falha interna | `500` (o Asaas reenvia) |

`GET` no mesmo endpoint devolve um payload de saude, porque o painel do Asaas
valida a URL antes de ativar o webhook.

---

## Rede de seguranca: sincronizacao manual

Webhook pode falhar. A action `sincronizarAssinatura()` reconsulta
`GET /subscriptions/{id}` e `GET /subscriptions/{id}/payments` e reconcilia o estado
local. Ela esta ligada ao botao "Ja paguei, atualizar" da tela `/assinatura`.

Mapeamento aplicado ali:

- assinatura remota `EXPIRED` -> `expired`;
- assinatura remota `INACTIVE` -> `canceled`;
- cobranca em `RECEIVED` / `CONFIRMED` / `RECEIVED_IN_CASH` -> `active`;
- cobranca em `OVERDUE` -> `past_due`.

---

## Suposicoes documentadas

Onde a documentacao oficial nao foi consultavel neste ambiente, a escolha foi
**encapsular** em vez de espalhar. Se alguma destas precisar de ajuste, o ponto de
mudanca e unico:

1. **Nomes dos status de cobranca** (`PENDING`, `RECEIVED`, `CONFIRMED`, `OVERDUE`,
   `AWAITING_RISK_ANALYSIS`, `RECEIVED_IN_CASH`) aparecem so em
   `subscriptions.ts` (`primeiraCobrancaEmAberto`) e em `assinatura.ts`
   (`sincronizarAssinatura`).
2. **Nomes dos eventos de webhook** ficam exclusivamente em `interpretarEvento()`
   (`lib/asaas/webhooks.ts`), coberta por teste unitario. Adicionar um evento novo e
   acrescentar um `case`.
3. **`GET /subscriptions/{id}/payments`** e usado para obter o `invoiceUrl` da
   fatura corrente. Se a rota mudar, o unico ponto de ajuste e
   `listarCobrancasDaAssinatura()`.
4. **Header do webhook** assumido como `asaas-access-token`. Se o painel usar outro
   nome, altere a leitura em `route.ts` - a validacao em si nao muda.

Nada disso foi espalhado por componentes ou paginas: a UI so conhece
`urlPagamento` e `status`.
