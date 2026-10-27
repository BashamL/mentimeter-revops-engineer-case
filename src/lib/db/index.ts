/**
 * A small JSON database in `.data/db.json`. The mock systems keep their
 * records here, and your app can keep its own under `app`.
 *
 * It starts from the seed files in `data/seed/`. `npm run db:reset` (or Reset
 * on the Dev tools page) puts everything back.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  KleerCustomer,
  KleerInvoice,
  OpportunityLineItem,
  PricebookEntry,
  Product,
  SalesforceAccount,
  SalesforceContact,
  SalesforceEvent,
  SalesforceOpportunity,
  SalesforceUser,
  SlackChannel,
  SlackMessage,
  SlackUser,
  StripeCustomer,
  StripeSubscription,
  Subscription,
  Workspace,
} from '@/lib/systems/types';

const VERSION = 1;
const ROOT = process.cwd();
const DB_FILE = join(ROOT, '.data', 'db.json');
const SEED_DIR = join(ROOT, 'data', 'seed');

export interface RequestLogEntry {
  id: number;
  at: string;
  system: 'salesforce' | 'admin' | 'kleer' | 'stripe' | 'slack';
  method: string;
  path: string;
  status: number;
  requestBody: unknown;
  responseBody: unknown;
  /** Stripe answered from an earlier request with the same idempotency key */
  replayed: boolean;
}

export interface WebhookDelivery {
  replayId: number;
  at: string;
  status: number;
  response: string;
}

export interface Db {
  version: number;
  salesforce: {
    users: SalesforceUser[];
    accounts: SalesforceAccount[];
    contacts: SalesforceContact[];
    opportunities: SalesforceOpportunity[];
    opportunityLineItems: OpportunityLineItem[];
    products: Product[];
    pricebookEntries: PricebookEntry[];
    events: SalesforceEvent[];
  };
  adminApp: { workspaces: Workspace[]; subscriptions: Subscription[] };
  kleer: {
    customers: KleerCustomer[];
    invoices: KleerInvoice[];
    articles: { articleNumber: string; name: string }[];
  };
  stripe: {
    customers: StripeCustomer[];
    subscriptions: StripeSubscription[];
    idempotencyKeys: Record<string, { request: string; status: number; response: unknown }>;
  };
  slack: {
    users: SlackUser[];
    channels: SlackChannel[];
    messages: SlackMessage[];
  };
  /** Counters for the IDs the mock systems hand out */
  counters: Record<string, number>;
  /** Every request to the mock systems, newest last */
  log: RequestLogEntry[];
  /** Events the Dev tools page sent to your webhook */
  deliveries: WebhookDelivery[];
  /** Yours. Keep whatever your app needs to remember here. */
  app: Record<string, unknown>;
}

function readSeed<T>(name: string): T {
  return JSON.parse(readFileSync(join(SEED_DIR, `${name}.json`), 'utf8'));
}

export function seedDb(): Db {
  return {
    version: VERSION,
    salesforce: readSeed('salesforce'),
    adminApp: readSeed('admin-app'),
    kleer: readSeed('kleer'),
    stripe: { ...readSeed<object>('stripe'), idempotencyKeys: {} } as Db['stripe'],
    slack: readSeed('slack'),
    counters: {},
    log: [],
    deliveries: [],
    app: {},
  };
}

interface Store {
  read(): Db;
  write(db: Db): void;
}

const fileStore: Store = {
  read() {
    if (existsSync(DB_FILE)) {
      const db = JSON.parse(readFileSync(DB_FILE, 'utf8')) as Db;
      if (db.version === VERSION) return db;
    }
    const db = seedDb();
    this.write(db);
    return db;
  },
  write(db) {
    mkdirSync(dirname(DB_FILE), { recursive: true });
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  },
};

function memoryStore(): Store {
  let db = seedDb();
  return {
    read: () => structuredClone(db),
    write: (next) => {
      db = structuredClone(next);
    },
  };
}

let store: Store = fileStore;

/** Tests: keep the database in memory, starting fresh from the seed. */
export function useMemoryDb() {
  store = memoryStore();
}

export function readDb(): Db {
  return store.read();
}

/** Reads the database, lets `change` edit it, and saves the result. */
export function updateDb<T>(change: (db: Db) => T): T {
  const db = store.read();
  const result = change(db);
  store.write(db);
  return result;
}

/** Puts every system back to the seed data. */
export function resetDb() {
  store.write(seedDb());
}

/** The next number for an ID sequence, e.g. nextId('subscription', 600). */
export function nextId(db: Db, sequence: string, start: number): number {
  db.counters[sequence] = (db.counters[sequence] ?? start) + 1;
  return db.counters[sequence];
}
