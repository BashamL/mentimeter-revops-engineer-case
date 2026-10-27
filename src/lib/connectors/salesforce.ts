import type {
  FieldValue,
  OpportunityLineItem,
  PricebookEntry,
  Product,
  SalesforceAccount,
  SalesforceContact,
  SalesforceEvent,
  SalesforceOpportunity,
  SalesforceUser,
} from '@/lib/systems/types';
import { request } from './http';

interface QueryResult<T> {
  totalSize: number;
  records: T[];
}

export type OpportunityWithLines = SalesforceOpportunity & {
  OpportunityLineItems: QueryResult<OpportunityLineItem>;
};

const id = encodeURIComponent;

export const salesforce = {
  listOpportunities: async (
    filter: { stage?: string; accountId?: string; closedAfter?: string } = {},
  ) =>
    (
      await request<QueryResult<SalesforceOpportunity>>('salesforce', 'GET', '/opportunities', {
        query: filter,
      })
    ).records,

  /** The opportunity as it is now, with its line items. */
  getOpportunity: (opportunityId: string) =>
    request<OpportunityWithLines>('salesforce', 'GET', `/opportunities/${id(opportunityId)}`),

  /**
   * Writes fields on an opportunity. A field name that doesn't exist yet
   * becomes a custom field: you're the Salesforce admin here.
   */
  updateOpportunity: (opportunityId: string, fields: Record<string, FieldValue>) =>
    request<null>('salesforce', 'PATCH', `/opportunities/${id(opportunityId)}`, {
      body: fields,
    }),

  listAccounts: async (ids?: string[]) =>
    (
      await request<QueryResult<SalesforceAccount>>('salesforce', 'GET', '/accounts', {
        query: { ids: ids?.join(',') },
      })
    ).records,

  getAccount: (accountId: string) =>
    request<SalesforceAccount>('salesforce', 'GET', `/accounts/${id(accountId)}`),

  updateAccount: (accountId: string, fields: Record<string, FieldValue>) =>
    request<null>('salesforce', 'PATCH', `/accounts/${id(accountId)}`, { body: fields }),

  listContacts: async (accountId?: string) =>
    (
      await request<QueryResult<SalesforceContact>>('salesforce', 'GET', '/contacts', {
        query: { accountId },
      })
    ).records,

  getContact: (contactId: string) =>
    request<SalesforceContact>('salesforce', 'GET', `/contacts/${id(contactId)}`),

  listUsers: async () =>
    (await request<QueryResult<SalesforceUser>>('salesforce', 'GET', '/users')).records,

  getUser: (userId: string) => request<SalesforceUser>('salesforce', 'GET', `/users/${id(userId)}`),

  listProducts: async () =>
    (await request<QueryResult<Product>>('salesforce', 'GET', '/products')).records,

  listPricebook: async (currency?: string) =>
    (
      await request<QueryResult<PricebookEntry>>('salesforce', 'GET', '/pricebook', {
        query: { currency },
      })
    ).records,

  /** Events after `after` (a replayId), oldest first, at most 100. */
  listEvents: (after = 0) =>
    request<{ events: SalesforceEvent[]; latestReplayId: number }>('salesforce', 'GET', '/events', {
      query: { after: String(after) },
    }),
};
