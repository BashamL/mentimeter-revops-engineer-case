import type { KleerCustomer, KleerInvoice } from '@/lib/systems/types';
import { request } from './http';

const id = encodeURIComponent;

export interface CreateKleerCustomerInput {
  name: string;
  email: string;
  country: string;
  currency: string;
  vatNumber?: string | null;
  address?: string | null;
}

export interface CreateKleerInvoiceInput {
  customerNumber: string;
  currency: string;
  lines: {
    articleNumber: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }[];
  /** Defaults to today */
  invoiceDate?: string;
  /** Defaults to 30 */
  paymentTermsDays?: number;
  servicePeriod?: { start: string; end: string };
  poNumber?: string | null;
  yourReference?: string | null;
  ourReference?: string | null;
  /** Your own ID for the invoice. You can search by it. Kleer doesn't stop duplicates. */
  foreignId?: string | null;
}

export const kleer = {
  findCustomers: (filter: { vatNumber?: string; name?: string; email?: string } = {}) =>
    request<KleerCustomer[]>('kleer', 'GET', '/customers', { query: filter }),

  getCustomer: (customerNumber: string) =>
    request<KleerCustomer>('kleer', 'GET', `/customers/${id(customerNumber)}`),

  createCustomer: (input: CreateKleerCustomerInput) =>
    request<KleerCustomer>('kleer', 'POST', '/customers', { body: input }),

  findInvoices: (filter: { customerNumber?: string; foreignId?: string; status?: string } = {}) =>
    request<KleerInvoice[]>('kleer', 'GET', '/invoices', { query: filter }),

  getInvoice: (invoiceNumber: string) =>
    request<KleerInvoice>('kleer', 'GET', `/invoices/${id(invoiceNumber)}`),

  /** Creates a draft. Kleer works out the amounts and VAT. */
  createInvoice: (input: CreateKleerInvoiceInput) =>
    request<KleerInvoice>('kleer', 'POST', '/invoices', { body: input }),

  deleteDraft: (invoiceNumber: string) =>
    request<null>('kleer', 'DELETE', `/invoices/${id(invoiceNumber)}`),

  /** Emails a draft to the customer. */
  sendInvoice: (invoiceNumber: string) =>
    request<KleerInvoice>('kleer', 'POST', `/invoices/${id(invoiceNumber)}/send`),

  /** Cancels a sent or paid invoice with a credit note. Returns the credit note. */
  creditInvoice: (invoiceNumber: string, reason: string) =>
    request<KleerInvoice>('kleer', 'POST', `/invoices/${id(invoiceNumber)}/credit`, {
      body: { reason },
    }),
};
