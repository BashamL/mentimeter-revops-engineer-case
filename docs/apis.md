# The mock APIs

Every system runs inside the app at `http://localhost:3000/api/mock/<system>`.
From TypeScript, use the connectors in `src/lib/connectors/`: they call the
same routes in-process and turn errors into a `ConnectorError`. From anything
else, call the URLs below.

The mocks check that a request is well formed, the way a real API would. They
don't know Mentimeter's billing rules: Kleer will draft an invoice without a PO
number, and Stripe will charge a card of any size. Applying the rules is up to
you.

Every request is recorded in the request log on the Dev tools page, with its
request and response. "Today" in the mocks is never earlier than Friday
6 November 2026.

## Each system has its own style

|            | Field names           | Errors                                                              |
| ---------- | --------------------- | ------------------------------------------------------------------- |
| Salesforce | `Payment_Method__c`   | HTTP 400 or 404 with `[{ "message", "errorCode", "fields" }]`       |
| Admin app  | `camelCase`           | HTTP 404, 409 or 422 with `{ "error": { "code", "message", "problems" } }` |
| Kleer      | `camelCase`           | Same as the admin app                                               |
| Stripe     | `snake_case`          | HTTP 400 or 404 with `{ "error": { "type", "code", "message", "param" } }` |
| Slack      | `snake_case`          | HTTP 200 with `{ "ok": false, "error": "channel_not_found" }`       |

## Salesforce

`/api/mock/salesforce`

| Method | Path | What it does |
| ------ | ---- | ------------ |
| GET | `/opportunities?stage=&accountId=&closedAfter=` | Opportunities as `{ totalSize, records }` |
| GET | `/opportunities/:id` | One opportunity, as it is now, with `OpportunityLineItems: { totalSize, records }` |
| PATCH | `/opportunities/:id` | Writes fields. Returns 204 with no body. |
| GET | `/accounts?ids=a,b` | Accounts |
| GET | `/accounts/:id` | One account |
| PATCH | `/accounts/:id` | Writes fields. Returns 204. |
| GET | `/contacts?accountId=` | Contacts |
| GET | `/contacts/:id` | One contact |
| GET | `/users` and `/users/:id` | Salesforce users: reps, finance and RevOps |
| GET | `/products` | Products: PRO, ENT and the ONB onboarding package |
| GET | `/pricebook?currency=` | List prices per product and currency |
| GET | `/events?after=0&limit=100` | Events after a `replayId`, oldest first: `{ events, latestReplayId }` |

**Writing fields.** `PATCH` takes a flat object, like the real API:
`{ "Subscription_ID__c": "SUB-601" }`. A field name that doesn't exist yet
becomes a custom field, since you're the Salesforce admin here. Name new
fields the Salesforce way, ending in `__c`. Values are text, numbers,
true/false or null. `Id`, `IsClosed`, `IsWon`, `RecordType`, `CreatedDate`
and `LastModifiedDate` are read-only.

**Events.** Salesforce publishes an event when an opportunity is won
(`opportunity.closed_won`), when a won opportunity is edited
(`opportunity.updated`) and when it's moved out of Closed Won
(`opportunity.reopened`). Each event carries `replayId`, `occurredAt`,
`changedFields` and a snapshot of the opportunity right after the change. The
opportunity endpoint returns how it looks now, which can differ from an
event's snapshot. The Dev tools page can also POST each event to
`/api/webhooks/salesforce`.

## Admin app

`/api/mock/admin`. Mentimeter's internal app for workspaces and subscriptions.

| Method | Path | What it does |
| ------ | ---- | ------------ |
| GET | `/workspaces?salesforceAccountId=&domain=` | Workspaces |
| GET | `/workspaces/:id` | One workspace |
| POST | `/workspaces` | Creates a workspace: `{ name, salesforceAccountId?, domain?, region? }` |
| PATCH | `/workspaces/:id` | Changes `name`, `salesforceAccountId` or `plan` |
| GET | `/subscriptions?workspaceId=&salesforceAccountId=&status=` | Subscriptions |
| GET | `/subscriptions/:id` | One subscription |
| POST | `/subscriptions` | Creates a subscription |
| PATCH | `/subscriptions/:id` | Changes `plan`, `seats`, `startDate`, `endDate`, `status`, `autoRenew`, `billingSystem` or `billingReference` |

Create a subscription:

```json
{
  "workspaceId": "WS-3001",
  "salesforceAccountId": "001...",
  "plan": "ENT",
  "seats": 80,
  "startDate": "2026-12-01",
  "endDate": "2027-11-30",
  "billingSystem": "Kleer",
  "status": "Scheduled",
  "billingReference": "2026-0312"
}
```

- `plan` is a product code. `seats` is a whole number above 0.
- `endDate` is the last day and can't be before `startDate`.
- `billingSystem` is `Kleer` or `Stripe`. `status` is `Active`, `Scheduled`,
  `Ended` or `Cancelled` and defaults to `Active`.
- The workspace must exist. If you leave out `salesforceAccountId`, the
  workspace's is used.

New workspaces start on the Free plan with no members. Workspaces created
self-service have no `salesforceAccountId`.

## Kleer

`/api/mock/kleer`. Invoicing for customers who pay by invoice.

| Method | Path | What it does |
| ------ | ---- | ------------ |
| GET | `/customers?vatNumber=&name=&email=` | Customers. `name` matches part of the name. |
| GET | `/customers/:number` | One customer |
| POST | `/customers` | Creates a customer: `{ name, email, country, currency, vatNumber?, address? }` |
| GET | `/invoices?customerNumber=&foreignId=&status=` | Invoices and credit notes |
| GET | `/invoices/:number` | One invoice |
| POST | `/invoices` | Creates a draft invoice |
| DELETE | `/invoices/:number` | Deletes a draft |
| POST | `/invoices/:number/send` | Sends a draft to the customer |
| POST | `/invoices/:number/credit` | Cancels a sent or paid invoice with a credit note: `{ reason }` |

Create an invoice:

```json
{
  "customerNumber": "1104",
  "currency": "EUR",
  "lines": [
    {
      "articleNumber": "ENT",
      "description": "Enterprise licenses, 1 Dec 2026 to 30 Nov 2027",
      "quantity": 80,
      "unitPrice": 360,
      "discountPercent": 8
    }
  ],
  "servicePeriod": { "start": "2026-12-01", "end": "2027-11-30" },
  "poNumber": "PO-1234",
  "yourReference": "Uwe Brandt",
  "foreignId": "006...",
  "paymentTermsDays": 30
}
```

- The customer must exist. `articleNumber` is `PRO`, `ENT` or `ONB`.
- Kleer works out each line's amount, the net amount, VAT and the total. It
  charges 25% Swedish VAT to customers in Sweden and to EU customers without a
  VAT number, and 0% to everyone else.
- `invoiceDate` defaults to today and `paymentTermsDays` to 30.
- `foreignId` is your own reference, such as the Salesforce opportunity ID.
  You can search by it, but Kleer won't stop you from creating two invoices
  with the same one.
- New invoices are drafts. Sending a draft twice returns `409 not_draft`.

## Stripe

`/api/mock/stripe`. Card payments. A simplified Stripe: JSON bodies and ISO
dates instead of form fields and timestamps.

| Method | Path | What it does |
| ------ | ---- | ------------ |
| GET | `/customers?email=&metadata[key]=value` | Customers, as `{ object: "list", data }` |
| GET | `/customers/:id` | One customer |
| POST | `/customers` | Creates a customer: `{ name, email, currency?, metadata? }` |
| GET | `/subscriptions?customer=&status=` | Subscriptions, as `{ object: "list", data }` |
| GET | `/subscriptions/:id` | One subscription |
| POST | `/subscriptions` | Creates a subscription and charges the first year |
| POST | `/subscriptions/:id` | Updates `quantity`, `amount`, `cancel_at_period_end` or `metadata` |
| DELETE | `/subscriptions/:id` | Cancels a subscription now |

Create a subscription:

```json
{
  "customer": "cus_...",
  "plan": "PRO",
  "quantity": 15,
  "currency": "usd",
  "amount": 3900,
  "start_date": "2026-11-04",
  "metadata": { "salesforce_opportunity_id": "006..." }
}
```

- `amount` is what the customer pays per year. The period runs one year from
  `start_date` (default today), and the subscription renews after it unless
  `cancel_at_period_end` is true.
- A customer has one currency. Mixing currencies fails with
  `currency_mismatch`.
- If the customer's card has expired, the subscription is created as
  `past_due` with `latest_invoice_status: "payment_failed"`.
- New customers get a working test card.

**Idempotency keys.** Every `POST` accepts an `Idempotency-Key` header
(`{ idempotencyKey }` in the connector). Repeat a request with the same key
and body, and Stripe returns the first response without creating anything.
Reusing a key with a different body fails with `idempotency_key_in_use`.

## Slack

`/api/mock/slack`. Like the real Web API, failures come back as HTTP 200 with
`ok: false`. The connector turns them into a `ConnectorError`.

| Method | Path | What it does |
| ------ | ---- | ------------ |
| POST | `/chat.postMessage` | `{ channel, text, thread_ts? }`. `channel` is a channel ID, `#name`, or a user ID for a direct message. |
| GET | `/users.lookupByEmail?email=` | Finds a person by work email |
| GET | `/users.list` | Everyone in the workspace |
| GET | `/conversations.list` | Channels. Add `?types=im` for people your app has messaged. |
| GET | `/conversations.history?channel=` | Messages in a channel or a direct conversation, newest first |

Messages your app sends show as "Your app". Mentions use Slack's
`<@U04MAJAEK0>` format.

## Webhook

`POST /api/webhooks/salesforce` is a stub in
`src/app/api/webhooks/salesforce/route.ts`. It logs each event and returns
202. The Dev tools page sends this week's events to it, one at a time or all
at once, and shows what it answered.
