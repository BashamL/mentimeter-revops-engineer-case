/**
 * Mock Stripe API (simplified: JSON bodies, ISO dates). Errors look like
 * Stripe's: `{ error: { type, code, message, param } }`. Every POST accepts an
 * `Idempotency-Key` header.
 */
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import * as clock from '@/lib/clock';
import { nextId, readDb, updateDb } from '@/lib/db';
import type { StripeCustomer, StripeSubscription } from '@/lib/systems/types';
import { body, check, isIsoDate, now, oneYearFrom, today } from './validate';

function stripeError(
  c: Context,
  status: 400 | 402 | 404,
  code: string,
  message: string,
  param?: string,
) {
  return c.json(
    {
      error: {
        type: status === 402 ? 'card_error' : 'invalid_request_error',
        code,
        message,
        param,
      },
    },
    status,
  );
}

function stripeId(prefix: string, n: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let x = n * 2654435761 + 97;
  let out = '';
  for (let i = 0; i < 14; i++) {
    out += alphabet[x % alphabet.length];
    x = Math.floor(x / alphabet.length) + n * 31 + i;
  }
  return `${prefix}_${out}`;
}

function canonical(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text;
  }
}

const idempotency: MiddlewareHandler = async (c, next) => {
  const key = c.req.header('idempotency-key');
  if (c.req.method !== 'POST' || !key) return next();
  const request = `${c.req.path} ${canonical(await c.req.raw.clone().text())}`;
  const stored = readDb().stripe.idempotencyKeys[key];
  if (stored) {
    if (stored.request !== request) {
      return stripeError(
        c,
        400,
        'idempotency_key_in_use',
        `Keys for idempotent requests can only be used with the same parameters they were first used with. Try using a key other than '${key}'.`,
      );
    }
    c.header('idempotent-replayed', 'true');
    return c.json(stored.response, stored.status as ContentfulStatusCode);
  }
  await next();
  if (c.res.status < 300) {
    const response = await c.res.clone().json();
    updateDb((db) => {
      db.stripe.idempotencyKeys[key] = { request, status: c.res.status, response };
    });
  }
};

function metadataOf(value: unknown): Record<string, string> | null {
  if (value === undefined) return {};
  const ok =
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => typeof v === 'string');
  return ok ? (value as Record<string, string>) : null;
}

function cardExpired(customer: StripeCustomer): boolean {
  const card = customer.default_payment_method;
  if (!card) return true;
  const endOfMonth = new Date(Date.UTC(card.exp_year, card.exp_month, 1));
  return endOfMonth.getTime() <= clock.now().getTime();
}

export function stripeRoutes() {
  const app = new Hono();
  app.use('*', idempotency);

  app.get('/customers', (c) => {
    const params = new URL(c.req.url).searchParams;
    const email = params.get('email');
    const metadata = [...params.entries()].flatMap(([key, value]) => {
      const match = /^metadata\[(.+)\]$/.exec(key);
      return match?.[1] ? [[match[1], value] as const] : [];
    });
    const data = readDb().stripe.customers.filter(
      (x) =>
        (!email || x.email === email) &&
        metadata.every(([key, value]) => x.metadata[key] === value),
    );
    return c.json({ object: 'list', data });
  });

  app.get('/customers/:id', (c) => {
    const customer = readDb().stripe.customers.find((x) => x.id === c.req.param('id'));
    return customer
      ? c.json(customer)
      : stripeError(c, 404, 'resource_missing', `No such customer: '${c.req.param('id')}'`, 'id');
  });

  app.post('/customers', async (c) => {
    const b = await body(c);
    const metadata = metadataOf(b.metadata);
    const problem =
      check.text(b.name, 'name') ??
      check.email(b.email, 'email') ??
      (b.currency !== undefined && check.text(b.currency, 'currency')) ??
      (metadata ? null : 'metadata must be an object of text values');
    if (problem) {
      return stripeError(c, 400, 'parameter_invalid', problem, problem.split(' ')[0]);
    }
    const customer = updateDb((db) => {
      const created: StripeCustomer = {
        id: stripeId('cus', nextId(db, 'stripeCustomer', 0)),
        name: b.name as string,
        email: b.email as string,
        currency: typeof b.currency === 'string' ? b.currency.toLowerCase() : null,
        metadata: metadata ?? {},
        default_payment_method: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2029,
        },
        created: now(),
      };
      db.stripe.customers.push(created);
      return created;
    });
    return c.json(customer, 201);
  });

  app.get('/subscriptions', (c) => {
    const { customer, status } = c.req.query();
    const data = readDb().stripe.subscriptions.filter(
      (s) => (!customer || s.customer === customer) && (!status || s.status === status),
    );
    return c.json({ object: 'list', data });
  });

  app.get('/subscriptions/:id', (c) => {
    const subscription = readDb().stripe.subscriptions.find((s) => s.id === c.req.param('id'));
    return subscription
      ? c.json(subscription)
      : stripeError(
          c,
          404,
          'resource_missing',
          `No such subscription: '${c.req.param('id')}'`,
          'id',
        );
  });

  app.post('/subscriptions', async (c) => {
    const b = await body(c);
    const db = readDb();
    const customer = db.stripe.customers.find((x) => x.id === b.customer);
    const plans = db.salesforce.products
      .filter((p) => p.Family === 'Subscription')
      .map((p) => p.ProductCode);
    const metadata = metadataOf(b.metadata);
    const problem =
      check.text(b.customer, 'customer') ??
      check.oneOf(b.plan, 'plan', plans) ??
      check.positiveInteger(b.quantity, 'quantity') ??
      check.text(b.currency, 'currency') ??
      check.number(b.amount, 'amount', 0.01) ??
      check.optionalDate(b.start_date, 'start_date') ??
      (metadata ? null : 'metadata must be an object of text values');
    if (problem) {
      return stripeError(c, 400, 'parameter_invalid', problem, problem.split(' ')[0]);
    }
    if (!customer) {
      return stripeError(
        c,
        400,
        'resource_missing',
        `No such customer: '${b.customer}'`,
        'customer',
      );
    }
    const currency = (b.currency as string).toLowerCase();
    if (customer.currency && customer.currency !== currency) {
      return stripeError(
        c,
        400,
        'currency_mismatch',
        `You cannot combine currencies on a single customer. This customer has an active subscription or balance in ${customer.currency}, but you are trying to use ${currency}.`,
        'currency',
      );
    }
    const start = isIsoDate(b.start_date) ? b.start_date : today();
    const failed = cardExpired(customer);
    const subscription = updateDb((next) => {
      const created: StripeSubscription = {
        id: stripeId('sub', nextId(next, 'stripeSubscription', 0)),
        customer: customer.id,
        status: failed ? 'past_due' : 'active',
        plan: b.plan as string,
        quantity: b.quantity as number,
        currency,
        amount: b.amount as number,
        interval: 'year',
        current_period_start: start,
        current_period_end: oneYearFrom(start),
        cancel_at_period_end: false,
        canceled_at: null,
        latest_invoice_status: failed ? 'payment_failed' : 'paid',
        ...(failed ? { last_payment_error: 'Your card has expired.' } : {}),
        metadata: metadata ?? {},
        created: now(),
      };
      next.stripe.subscriptions.push(created);
      const owner = next.stripe.customers.find((x) => x.id === customer.id);
      if (owner && !owner.currency) owner.currency = currency;
      return created;
    });
    return c.json(subscription, 201);
  });

  app.post('/subscriptions/:id', async (c) => {
    const b = await body(c);
    const unknown = Object.keys(b).filter(
      (k) => !['quantity', 'amount', 'cancel_at_period_end', 'metadata'].includes(k),
    );
    const problem =
      (unknown[0] ? `Received unknown parameter: ${unknown[0]}` : null) ??
      ('quantity' in b ? check.positiveInteger(b.quantity, 'quantity') : null) ??
      ('amount' in b ? check.number(b.amount, 'amount', 0.01) : null) ??
      ('cancel_at_period_end' in b && typeof b.cancel_at_period_end !== 'boolean'
        ? 'cancel_at_period_end must be true or false'
        : null) ??
      (metadataOf(b.metadata) ? null : 'metadata must be an object of text values');
    if (problem) return stripeError(c, 400, 'parameter_invalid', problem);
    const subscription = updateDb((db) => {
      const found = db.stripe.subscriptions.find((s) => s.id === c.req.param('id'));
      if (!found) return null;
      if ('quantity' in b) found.quantity = b.quantity as number;
      if ('amount' in b) found.amount = b.amount as number;
      if ('cancel_at_period_end' in b) {
        found.cancel_at_period_end = b.cancel_at_period_end as boolean;
      }
      if (b.metadata) {
        found.metadata = { ...found.metadata, ...(b.metadata as Record<string, string>) };
      }
      return found;
    });
    return subscription
      ? c.json(subscription)
      : stripeError(
          c,
          404,
          'resource_missing',
          `No such subscription: '${c.req.param('id')}'`,
          'id',
        );
  });

  app.delete('/subscriptions/:id', (c) => {
    const existing = readDb().stripe.subscriptions.find((s) => s.id === c.req.param('id'));
    if (!existing) {
      return stripeError(
        c,
        404,
        'resource_missing',
        `No such subscription: '${c.req.param('id')}'`,
        'id',
      );
    }
    if (existing.status === 'canceled') {
      return stripeError(
        c,
        400,
        'subscription_canceled',
        `This subscription was already canceled on ${existing.canceled_at}.`,
      );
    }
    const subscription = updateDb((db) => {
      const found = db.stripe.subscriptions.find((s) => s.id === existing.id);
      if (found) Object.assign(found, { status: 'canceled', canceled_at: now() });
      return found;
    });
    return c.json(subscription);
  });

  return app;
}
