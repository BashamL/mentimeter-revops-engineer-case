/**
 * Checks that the mock systems behave as docs/apis.md says. Use these as
 * examples for your own tests: call the connectors, then read the database.
 */
import { describe, expect, it } from 'vitest';
import { adminApp, ConnectorError, kleer, salesforce, slack, stripe } from '@/lib/connectors';
import { readDb } from '@/lib/db';

describe('Salesforce', () => {
  it('has this week’s events in order', async () => {
    const { events, latestReplayId } = await salesforce.listEvents();
    expect(events).toHaveLength(21);
    expect(latestReplayId).toBe(21);
    expect(events.map((e) => e.replayId)).toEqual([...Array(21)].map((_, i) => i + 1));
  });

  it('writes fields back, including new custom fields', async () => {
    const [deal] = await salesforce.listOpportunities({ stage: 'Closed Won' });
    await salesforce.updateOpportunity(deal.Id, { Example__c: 'hello' });
    expect((await salesforce.getOpportunity(deal.Id)).Example__c).toBe('hello');
  });

  it('rejects read-only fields the way Salesforce does', async () => {
    const [deal] = await salesforce.listOpportunities();
    const error = await salesforce.updateOpportunity(deal.Id, { Id: 'x' }).catch((e) => e);
    expect(error).toBeInstanceOf(ConnectorError);
    expect(error.code).toBe('INVALID_FIELD_FOR_INSERT_UPDATE');
  });
});

describe('Kleer', () => {
  it('works out amounts and VAT on a draft', async () => {
    const customer = await kleer.createCustomer({
      name: 'Example AB',
      email: 'ap@example.com',
      country: 'Sweden',
      currency: 'SEK',
      vatNumber: 'SE556000000001',
    });
    const invoice = await kleer.createInvoice({
      customerNumber: customer.customerNumber,
      currency: 'SEK',
      lines: [
        {
          articleNumber: 'ENT',
          description: 'Enterprise',
          quantity: 10,
          unitPrice: 4000,
          discountPercent: 10,
        },
      ],
    });
    expect(invoice).toMatchObject({
      status: 'draft',
      netAmount: 36000,
      vatRate: 25,
      totalAmount: 45000,
    });
  });

  it('rejects an invoice for a customer that does not exist', async () => {
    const error = await kleer
      .createInvoice({ customerNumber: '9999', currency: 'EUR', lines: [] })
      .catch((e) => e);
    expect(error).toBeInstanceOf(ConnectorError);
    expect(error.status).toBe(422);
  });
});

describe('Stripe', () => {
  it('replays a POST sent again with the same idempotency key', async () => {
    const input = { name: 'Example Ltd', email: 'billing@example.com' };
    const first = await stripe.createCustomer(input, { idempotencyKey: 'example' });
    const second = await stripe.createCustomer(input, { idempotencyKey: 'example' });
    expect(second.id).toBe(first.id);
    expect(readDb().stripe.customers.filter((c) => c.email === input.email)).toHaveLength(1);
  });
});

describe('Admin app', () => {
  it('creates a subscription on a workspace', async () => {
    const workspace = await adminApp.createWorkspace({ name: 'Example' });
    const subscription = await adminApp.createSubscription({
      workspaceId: workspace.id,
      plan: 'PRO',
      seats: 5,
      startDate: '2026-11-10',
      endDate: '2027-11-09',
      billingSystem: 'Stripe',
    });
    expect(subscription).toMatchObject({ status: 'Active', seats: 5 });
  });
});

describe('Slack', () => {
  it('finds people by email and fails like Slack does', async () => {
    const user = await slack.lookupUserByEmail('maja.ek@mentimeter.example');
    expect(user.real_name).toBe('Maja Ek');
    const error = await slack.postMessage({ channel: '#nope', text: 'Hi' }).catch((e) => e);
    expect(error.code).toBe('channel_not_found');
  });
});
