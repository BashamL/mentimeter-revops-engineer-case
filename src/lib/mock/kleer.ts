/**
 * Mock Kleer API: customers and invoices. Invoices start as drafts. Kleer
 * works out line amounts, totals and VAT itself.
 */
import { Hono } from 'hono';
import { nextId, readDb, updateDb } from '@/lib/db';
import type { KleerCustomer, KleerInvoice } from '@/lib/systems/types';
import { addDays, appError, body, check, now, problems, today } from './validate';

const CURRENCIES = ['SEK', 'EUR', 'USD', 'GBP', 'NOK', 'DKK', 'CHF'] as const;

export const EU_COUNTRIES = new Set([
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Ireland',
  'Italy',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Netherlands',
  'Poland',
  'Portugal',
  'Romania',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
]);

/** Swedish VAT applies in Sweden, and to EU customers without a VAT number. */
function vatRate(customer: KleerCustomer): number {
  if (customer.country === 'Sweden') return 25;
  if (EU_COUNTRIES.has(customer.country) && !customer.vatNumber) return 25;
  return 0;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function kleerRoutes() {
  const app = new Hono();

  app.get('/customers', (c) => {
    const { vatNumber, name, email } = c.req.query();
    return c.json(
      readDb().kleer.customers.filter(
        (x) =>
          (!vatNumber || x.vatNumber === vatNumber) &&
          (!email || x.email === email) &&
          (!name || x.name.toLowerCase().includes(name.toLowerCase())),
      ),
    );
  });

  app.get('/customers/:number', (c) => {
    const customer = readDb().kleer.customers.find(
      (x) => x.customerNumber === c.req.param('number'),
    );
    return customer ? c.json(customer) : appError(c, 404, 'not_found', 'Customer not found');
  });

  app.post('/customers', async (c) => {
    const b = await body(c);
    const list = problems(
      check.text(b.name, 'name'),
      check.email(b.email, 'email'),
      check.text(b.country, 'country'),
      check.oneOf(b.currency, 'currency', CURRENCIES),
      check.optionalText(b.vatNumber, 'vatNumber'),
      check.optionalText(b.address, 'address'),
    );
    if (list.length > 0) {
      return appError(c, 422, 'validation_failed', list.join('; '), list);
    }
    const customer = updateDb((db) => {
      const created: KleerCustomer = {
        customerNumber: String(nextId(db, 'kleerCustomer', 1103)),
        name: b.name as string,
        vatNumber: (b.vatNumber as string | undefined) ?? null,
        email: b.email as string,
        country: b.country as string,
        currency: b.currency as string,
        address: (b.address as string | undefined) ?? null,
        createdAt: now(),
      };
      db.kleer.customers.push(created);
      return created;
    });
    return c.json(customer, 201);
  });

  app.get('/invoices', (c) => {
    const { customerNumber, foreignId, status } = c.req.query();
    return c.json(
      readDb().kleer.invoices.filter(
        (i) =>
          (!customerNumber || i.customerNumber === customerNumber) &&
          (!foreignId || i.foreignId === foreignId) &&
          (!status || i.status === status),
      ),
    );
  });

  app.get('/invoices/:number', (c) => {
    const invoice = readDb().kleer.invoices.find((i) => i.invoiceNumber === c.req.param('number'));
    return invoice ? c.json(invoice) : appError(c, 404, 'not_found', 'Invoice not found');
  });

  app.post('/invoices', async (c) => {
    const b = await body(c);
    const db = readDb();
    const customer = db.kleer.customers.find((x) => x.customerNumber === b.customerNumber);
    const articles = db.kleer.articles.map((a) => a.articleNumber);
    const lines = Array.isArray(b.lines) ? (b.lines as Record<string, unknown>[]) : [];
    const period = (b.servicePeriod ?? null) as Record<string, unknown> | null;
    const list = problems(
      check.text(b.customerNumber, 'customerNumber'),
      typeof b.customerNumber === 'string' && !customer
        ? `customer ${b.customerNumber} does not exist`
        : null,
      check.oneOf(b.currency, 'currency', CURRENCIES),
      lines.length === 0 ? 'lines must have at least one line' : null,
      ...lines.flatMap((l, i) =>
        problems(
          check.oneOf(l.articleNumber, `lines[${i}].articleNumber`, articles),
          check.text(l.description, `lines[${i}].description`),
          typeof l.quantity === 'number' && l.quantity > 0
            ? null
            : `lines[${i}].quantity must be a number above 0`,
          check.number(l.unitPrice, `lines[${i}].unitPrice`),
          l.discountPercent === undefined
            ? null
            : check.number(l.discountPercent, `lines[${i}].discountPercent`),
        ),
      ),
      check.optionalDate(b.invoiceDate, 'invoiceDate'),
      period ? check.date(period.start, 'servicePeriod.start') : null,
      period ? check.date(period.end, 'servicePeriod.end') : null,
      period ? check.dateOrder(period.start, period.end, 'servicePeriod') : null,
      b.paymentTermsDays === undefined
        ? null
        : check.positiveInteger(b.paymentTermsDays, 'paymentTermsDays'),
      check.optionalText(b.poNumber, 'poNumber'),
      check.optionalText(b.yourReference, 'yourReference'),
      check.optionalText(b.ourReference, 'ourReference'),
      check.optionalText(b.foreignId, 'foreignId'),
    );
    if (list.length > 0 || !customer) {
      return appError(c, 422, 'validation_failed', list.join('; '), list);
    }

    const invoice = updateDb((next) => {
      const outLines = lines.map((l) => {
        const discountPercent = (l.discountPercent as number | undefined) ?? 0;
        return {
          articleNumber: l.articleNumber as string,
          description: l.description as string,
          quantity: l.quantity as number,
          unitPrice: l.unitPrice as number,
          discountPercent,
          amount: round(
            (l.quantity as number) * (l.unitPrice as number) * (1 - discountPercent / 100),
          ),
        };
      });
      const netAmount = round(outLines.reduce((sum, l) => sum + l.amount, 0));
      const rate = vatRate(customer);
      const vatAmount = round((netAmount * rate) / 100);
      const invoiceDate = (b.invoiceDate as string | undefined) ?? today();
      const terms = (b.paymentTermsDays as number | undefined) ?? 30;
      const created: KleerInvoice = {
        invoiceNumber: `2026-${String(nextId(next, 'kleerInvoice', 311)).padStart(4, '0')}`,
        type: 'invoice',
        customerNumber: customer.customerNumber,
        status: 'draft',
        invoiceDate,
        dueDate: addDays(invoiceDate, terms),
        currency: b.currency as string,
        lines: outLines,
        netAmount,
        vatRate: rate,
        vatAmount,
        totalAmount: round(netAmount + vatAmount),
        servicePeriod: period
          ? { start: period.start as string, end: period.end as string }
          : { start: invoiceDate, end: invoiceDate },
        poNumber: (b.poNumber as string | undefined) ?? null,
        yourReference: (b.yourReference as string | undefined) ?? null,
        ourReference: (b.ourReference as string | undefined) ?? null,
        foreignId: (b.foreignId as string | undefined) ?? null,
        paymentTermsDays: terms,
        sentAt: null,
        paidAt: null,
        creditedBy: null,
        creditsInvoice: null,
        createdAt: now(),
      };
      next.kleer.invoices.push(created);
      return created;
    });
    return c.json(invoice, 201);
  });

  app.delete('/invoices/:number', (c) => {
    const invoice = readDb().kleer.invoices.find((i) => i.invoiceNumber === c.req.param('number'));
    if (!invoice) return appError(c, 404, 'not_found', 'Invoice not found');
    if (invoice.status !== 'draft') {
      return appError(
        c,
        409,
        'not_draft',
        'Only drafts can be deleted. Credit a sent invoice instead.',
      );
    }
    updateDb((db) => {
      db.kleer.invoices = db.kleer.invoices.filter(
        (i) => i.invoiceNumber !== invoice.invoiceNumber,
      );
    });
    return c.body(null, 204);
  });

  app.post('/invoices/:number/send', (c) => {
    const invoice = readDb().kleer.invoices.find((i) => i.invoiceNumber === c.req.param('number'));
    if (!invoice) return appError(c, 404, 'not_found', 'Invoice not found');
    if (invoice.status !== 'draft') {
      return appError(
        c,
        409,
        'not_draft',
        `Invoice ${invoice.invoiceNumber} is ${invoice.status}, not a draft`,
      );
    }
    const sent = updateDb((db) => {
      const found = db.kleer.invoices.find((i) => i.invoiceNumber === invoice.invoiceNumber);
      if (found) Object.assign(found, { status: 'sent', sentAt: now() });
      return found;
    });
    return c.json(sent);
  });

  app.post('/invoices/:number/credit', async (c) => {
    const b = await body(c);
    const invoice = readDb().kleer.invoices.find((i) => i.invoiceNumber === c.req.param('number'));
    if (!invoice) return appError(c, 404, 'not_found', 'Invoice not found');
    if (!['sent', 'paid'].includes(invoice.status)) {
      return appError(
        c,
        409,
        'not_creditable',
        `Invoice ${invoice.invoiceNumber} is ${invoice.status}. Only sent or paid invoices can be credited.`,
      );
    }
    const reason = typeof b.reason === 'string' ? b.reason : 'Credit';
    const creditNote = updateDb((db) => {
      const original = db.kleer.invoices.find((i) => i.invoiceNumber === invoice.invoiceNumber);
      const created: KleerInvoice = {
        ...invoice,
        invoiceNumber: `2026-${String(nextId(db, 'kleerInvoice', 311)).padStart(4, '0')}`,
        type: 'credit_note',
        status: 'credit',
        invoiceDate: today(),
        dueDate: today(),
        lines: invoice.lines.map((l) => ({
          ...l,
          description: `${reason}: ${l.description}`,
          quantity: -l.quantity,
          amount: -l.amount,
        })),
        netAmount: -invoice.netAmount,
        vatAmount: -invoice.vatAmount,
        totalAmount: -invoice.totalAmount,
        sentAt: now(),
        paidAt: null,
        creditedBy: null,
        creditsInvoice: invoice.invoiceNumber,
        createdAt: now(),
      };
      db.kleer.invoices.push(created);
      if (original) {
        original.status = 'credited';
        original.creditedBy = created.invoiceNumber;
      }
      return created;
    });
    return c.json(creditNote, 201);
  });

  return app;
}
