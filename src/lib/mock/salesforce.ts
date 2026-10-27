/**
 * Mock Salesforce REST API. Errors come back the way Salesforce sends them: an
 * array of `{ message, errorCode, fields }`. A successful PATCH returns 204.
 */
import { type Context, Hono } from 'hono';
import { readDb, updateDb } from '@/lib/db';
import type { FieldValue } from '@/lib/systems/types';
import { body, now } from './validate';

const READ_ONLY = new Set([
  'Id',
  'IsClosed',
  'IsWon',
  'CreatedDate',
  'LastModifiedDate',
  'RecordType',
  'OpportunityLineItems',
]);

function sfError(
  c: Context,
  status: 400 | 404,
  errorCode: string,
  message: string,
  fields: string[] = [],
) {
  return c.json([{ message, errorCode, fields }], status);
}

function fieldProblems(fields: Record<string, unknown>) {
  if (Object.keys(fields).length === 0) {
    return { code: 'JSON_PARSER_ERROR', message: 'No fields to update', fields: [] };
  }
  for (const [name, value] of Object.entries(fields)) {
    if (READ_ONLY.has(name)) {
      return {
        code: 'INVALID_FIELD_FOR_INSERT_UPDATE',
        message: `Unable to create/update fields: ${name}. Please check the security settings of this field.`,
        fields: [name],
      };
    }
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      return {
        code: 'INVALID_FIELD',
        message: `No such column '${name}'`,
        fields: [name],
      };
    }
    const scalar = value === null || ['string', 'number', 'boolean'].includes(typeof value);
    if (!scalar) {
      return {
        code: 'INVALID_TYPE',
        message: `${name}: a field holds text, a number, true/false or null`,
        fields: [name],
      };
    }
  }
  return null;
}

export function salesforceRoutes() {
  const app = new Hono();

  app.get('/opportunities', (c) => {
    const { stage, accountId, closedAfter } = c.req.query();
    const records = readDb().salesforce.opportunities.filter(
      (o) =>
        (!stage || o.StageName === stage) &&
        (!accountId || o.AccountId === accountId) &&
        (!closedAfter || o.CloseDate >= closedAfter),
    );
    return c.json({ totalSize: records.length, records });
  });

  app.get('/opportunities/:id', (c) => {
    const db = readDb();
    const id = c.req.param('id');
    const opportunity = db.salesforce.opportunities.find((o) => o.Id === id);
    if (!opportunity) {
      return sfError(c, 404, 'NOT_FOUND', 'The requested resource does not exist');
    }
    const lines = db.salesforce.opportunityLineItems.filter((l) => l.OpportunityId === id);
    return c.json({
      ...opportunity,
      OpportunityLineItems: { totalSize: lines.length, records: lines },
    });
  });

  app.patch('/opportunities/:id', async (c) => {
    const fields = await body(c);
    const problem = fieldProblems(fields);
    if (problem) {
      return sfError(c, 400, problem.code, problem.message, problem.fields);
    }
    const found = updateDb((db) => {
      const opportunity = db.salesforce.opportunities.find((o) => o.Id === c.req.param('id'));
      if (!opportunity) return false;
      Object.assign(opportunity, fields as Record<string, FieldValue>, {
        LastModifiedDate: now(),
      });
      return true;
    });
    if (!found) {
      return sfError(c, 404, 'NOT_FOUND', 'The requested resource does not exist');
    }
    return c.body(null, 204);
  });

  app.get('/accounts', (c) => {
    const ids = c.req.query('ids')?.split(',');
    const records = readDb().salesforce.accounts.filter((a) => !ids || ids.includes(a.Id));
    return c.json({ totalSize: records.length, records });
  });

  app.get('/accounts/:id', (c) => {
    const account = readDb().salesforce.accounts.find((a) => a.Id === c.req.param('id'));
    return account
      ? c.json(account)
      : sfError(c, 404, 'NOT_FOUND', 'The requested resource does not exist');
  });

  app.patch('/accounts/:id', async (c) => {
    const fields = await body(c);
    const problem = fieldProblems(fields);
    if (problem) {
      return sfError(c, 400, problem.code, problem.message, problem.fields);
    }
    const found = updateDb((db) => {
      const account = db.salesforce.accounts.find((a) => a.Id === c.req.param('id'));
      if (!account) return false;
      Object.assign(account, fields);
      return true;
    });
    if (!found) {
      return sfError(c, 404, 'NOT_FOUND', 'The requested resource does not exist');
    }
    return c.body(null, 204);
  });

  app.get('/contacts', (c) => {
    const accountId = c.req.query('accountId');
    const records = readDb().salesforce.contacts.filter(
      (x) => !accountId || x.AccountId === accountId,
    );
    return c.json({ totalSize: records.length, records });
  });

  app.get('/contacts/:id', (c) => {
    const contact = readDb().salesforce.contacts.find((x) => x.Id === c.req.param('id'));
    return contact
      ? c.json(contact)
      : sfError(c, 404, 'NOT_FOUND', 'The requested resource does not exist');
  });

  app.get('/users', (c) => {
    const records = readDb().salesforce.users;
    return c.json({ totalSize: records.length, records });
  });

  app.get('/users/:id', (c) => {
    const user = readDb().salesforce.users.find((u) => u.Id === c.req.param('id'));
    return user
      ? c.json(user)
      : sfError(c, 404, 'NOT_FOUND', 'The requested resource does not exist');
  });

  app.get('/products', (c) => {
    const records = readDb().salesforce.products;
    return c.json({ totalSize: records.length, records });
  });

  app.get('/pricebook', (c) => {
    const currency = c.req.query('currency');
    const records = readDb().salesforce.pricebookEntries.filter(
      (p) => !currency || p.CurrencyIsoCode === currency,
    );
    return c.json({ totalSize: records.length, records });
  });

  app.get('/events', (c) => {
    const after = Number(c.req.query('after') ?? 0);
    const limit = Math.min(Number(c.req.query('limit') ?? 100), 100);
    const all = readDb().salesforce.events;
    const events = all.filter((e) => e.replayId > after).slice(0, limit);
    return c.json({
      events,
      latestReplayId: all.at(-1)?.replayId ?? 0,
    });
  });

  return app;
}
