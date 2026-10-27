import type { StripeCustomer, StripeSubscription } from '@/lib/systems/types';
import { request } from './http';

const id = encodeURIComponent;

interface List<T> {
  object: 'list';
  data: T[];
}

export interface StripeOptions {
  /** Stripe returns the first response again for a retried POST with the same key. */
  idempotencyKey?: string;
}

const headers = (options: StripeOptions) =>
  options.idempotencyKey ? { 'idempotency-key': options.idempotencyKey } : undefined;

export const stripe = {
  findCustomers: async (filter: { email?: string; metadata?: Record<string, string> } = {}) =>
    (
      await request<List<StripeCustomer>>('stripe', 'GET', '/customers', {
        query: {
          email: filter.email,
          ...Object.fromEntries(
            Object.entries(filter.metadata ?? {}).map(([k, v]) => [`metadata[${k}]`, v]),
          ),
        },
      })
    ).data,

  getCustomer: (customerId: string) =>
    request<StripeCustomer>('stripe', 'GET', `/customers/${id(customerId)}`),

  createCustomer: (
    input: { name: string; email: string; currency?: string; metadata?: Record<string, string> },
    options: StripeOptions = {},
  ) =>
    request<StripeCustomer>('stripe', 'POST', '/customers', {
      body: input,
      headers: headers(options),
    }),

  listSubscriptions: async (filter: { customer?: string; status?: string } = {}) =>
    (
      await request<List<StripeSubscription>>('stripe', 'GET', '/subscriptions', {
        query: filter,
      })
    ).data,

  getSubscription: (subscriptionId: string) =>
    request<StripeSubscription>('stripe', 'GET', `/subscriptions/${id(subscriptionId)}`),

  /** Charges the customer's card for the first year straight away. */
  createSubscription: (
    input: {
      customer: string;
      plan: string;
      quantity: number;
      currency: string;
      /** What the customer pays per year */
      amount: number;
      /** Defaults to today */
      start_date?: string;
      metadata?: Record<string, string>;
    },
    options: StripeOptions = {},
  ) =>
    request<StripeSubscription>('stripe', 'POST', '/subscriptions', {
      body: input,
      headers: headers(options),
    }),

  updateSubscription: (
    subscriptionId: string,
    changes: {
      quantity?: number;
      amount?: number;
      cancel_at_period_end?: boolean;
      metadata?: Record<string, string>;
    },
    options: StripeOptions = {},
  ) =>
    request<StripeSubscription>('stripe', 'POST', `/subscriptions/${id(subscriptionId)}`, {
      body: changes,
      headers: headers(options),
    }),

  /** Ends a subscription now. To stop it renewing, set cancel_at_period_end instead. */
  cancelSubscription: (subscriptionId: string) =>
    request<StripeSubscription>('stripe', 'DELETE', `/subscriptions/${id(subscriptionId)}`),
};
