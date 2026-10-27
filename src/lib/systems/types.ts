/**
 * The records each system holds. Field names follow each system's own style:
 * Salesforce uses API names (`Payment_Method__c`), Stripe uses snake_case and
 * Kleer and the admin app use camelCase.
 */

// ── Salesforce ──────────────────────────────────────────────

/** A Salesforce field value. */
export type FieldValue = string | number | boolean | null;

export interface SalesforceUser {
  Id: string;
  Name: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Title: string;
  /** AE, RM, CSM, Finance, RevOps or System */
  UserRole: { Name: string };
  Region__c: string;
  IsActive: boolean;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  /** "Customer" or "Prospect" */
  Type: string;
  Industry: string;
  NumberOfEmployees: number;
  Website: string;
  Region__c: string;
  BillingStreet: string;
  BillingCity: string;
  BillingPostalCode: string;
  BillingCountry: string;
  CurrencyIsoCode: string;
  Legal_Entity_Name__c: string | null;
  VAT_Number__c: string | null;
  Invoice_Email__c: string | null;
  PO_Required__c: boolean;
  /** The account's workspace in the admin app */
  Workspace_ID__c: string | null;
  Workspace_URL__c: string | null;
  Kleer_Customer_Number__c: string | null;
  OwnerId: string;
  CSM__c: string | null;
  [field: string]: unknown;
}

export interface SalesforceContact {
  Id: string;
  AccountId: string;
  FirstName: string;
  LastName: string;
  Name: string;
  Title: string;
  Email: string;
}

export type RecordTypeName = 'New' | 'Add_on' | 'Renewal';

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  AccountId: string;
  RecordType: { DeveloperName: RecordTypeName; Name: string };
  StageName: string;
  IsClosed: boolean;
  IsWon: boolean;
  CloseDate: string;
  Amount: number | null;
  CurrencyIsoCode: string;
  OwnerId: string;
  /** Product code of the plan, e.g. "ENT" */
  Plan__c: string | null;
  /** Licenses sold on this deal. For an add-on, the licenses added. */
  Number_of_Licenses__c: number | null;
  /** Licenses the customer has after this deal */
  Total_Licenses__c: number | null;
  /** List price per license per year, in the deal's currency */
  Price_per_License_per_Year__c: number | null;
  /** Percent, e.g. 10 for 10% off */
  Discount__c: number | null;
  /** "12 months", "24 months" or "Co-term" */
  Contract_Term__c: string | null;
  Start_Date__c: string | null;
  End_Date__c: string | null;
  Multi_Year_deal__c: boolean;
  /** "Invoiced annually" or "Paid upfront" on multi-year deals */
  Multi_Year_Payment_Terms__c: string | null;
  /** "Invoice" or "Card" */
  Payment_Method__c: string | null;
  /** Legacy checkbox from the old quote template */
  Credit_Card_Payment__c: boolean;
  PO_Number__c: string | null;
  /** Contact ID */
  Billing_Contact__c: string | null;
  /** "Not required", "Pending" or "Approved" */
  Discount_Approval__c: string | null;
  /** The deal this one renews or adds to */
  Original_Opportunity__c: string | null;
  /** The admin app subscription this deal created or changed */
  Subscription_ID__c: string | null;
  /** The Kleer invoice for this deal */
  Invoice_Number__c: string | null;
  Description: string | null;
  CreatedDate: string;
  LastModifiedDate: string;
  [field: string]: unknown;
}

export interface OpportunityLineItem {
  Id: string;
  OpportunityId: string;
  ProductCode: string;
  Name: string;
  Quantity: number;
  /** List price */
  UnitPrice: number;
  /** Percent */
  Discount: number;
  TotalPrice: number;
  ServiceDate: string | null;
  Description: string | null;
}

export interface Product {
  Id: string;
  ProductCode: string;
  Name: string;
  /** "Subscription" or "Services" */
  Family: string;
  Description: string;
  Min_Licenses__c: number | null;
  IsActive: boolean;
}

export interface PricebookEntry {
  Id: string;
  ProductCode: string;
  CurrencyIsoCode: string;
  /** List price. Per license per year for subscriptions. */
  UnitPrice: number;
  IsActive: boolean;
}

export type SalesforceEventType =
  | 'opportunity.closed_won'
  | 'opportunity.updated'
  | 'opportunity.reopened';

/**
 * Salesforce publishes an event every time a Closed Won opportunity changes:
 * when it's won, when it's edited afterwards and when it's moved out of
 * Closed Won again.
 */
export interface SalesforceEvent {
  /** Increases by one per event. Use it to resume where you left off. */
  replayId: number;
  type: SalesforceEventType;
  occurredAt: string;
  opportunityId: string;
  changedFields: string[];
  /** The opportunity as it was right after the change */
  opportunity: SalesforceOpportunity;
}

// ── Admin app ───────────────────────────────────────────────

export interface Workspace {
  /** e.g. "WS-1001" */
  id: string;
  name: string;
  /** Null when the workspace was created self-service and never linked */
  salesforceAccountId: string | null;
  domain: string | null;
  region: 'EU' | 'US';
  /** "Free", "Pro" or "Enterprise" */
  plan: string;
  activeMembers: number;
  ownerEmail: string | null;
  createdAt: string;
}

export type BillingSystem = 'Kleer' | 'Stripe';

export type SubscriptionStatus = 'Active' | 'Scheduled' | 'Ended' | 'Cancelled';

export interface Subscription {
  /** e.g. "SUB-501" */
  id: string;
  workspaceId: string;
  salesforceAccountId: string | null;
  /** Product code, e.g. "ENT" */
  plan: string;
  seats: number;
  startDate: string;
  /** The last day of the subscription */
  endDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
  billingSystem: BillingSystem;
  /** The subscription's ID or invoice number in the billing system */
  billingReference: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── Kleer ───────────────────────────────────────────────────

export interface KleerCustomer {
  customerNumber: string;
  name: string;
  vatNumber: string | null;
  email: string;
  country: string;
  currency: string;
  address: string | null;
  createdAt: string;
}

export interface KleerInvoiceLine {
  articleNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  /** Kleer works this out: quantity x unitPrice x (1 - discount) */
  amount: number;
}

export interface KleerInvoice {
  /** e.g. "2026-0142" */
  invoiceNumber: string;
  type: 'invoice' | 'credit_note';
  customerNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'credited' | 'credit';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  lines: KleerInvoiceLine[];
  netAmount: number;
  /** 25 for Swedish customers and EU customers without a VAT number */
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  servicePeriod: { start: string; end: string };
  poNumber: string | null;
  /** The customer's contact or reference */
  yourReference: string | null;
  /** Our contact */
  ourReference: string | null;
  /** Your own ID for the invoice, e.g. the Salesforce opportunity ID */
  foreignId: string | null;
  paymentTermsDays: number;
  sentAt: string | null;
  paidAt: string | null;
  /** The credit note that cancelled this invoice */
  creditedBy: string | null;
  /** On a credit note: the invoice it cancels */
  creditsInvoice: string | null;
  createdAt: string;
}

// ── Stripe ──────────────────────────────────────────────────

export interface StripeCustomer {
  /** e.g. "cus_R4nB7wZk2LmP0a" */
  id: string;
  name: string;
  email: string;
  /** Lowercase, e.g. "sek" */
  currency: string | null;
  metadata: Record<string, string>;
  default_payment_method: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  created: string;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  /** Product code, e.g. "PRO" */
  plan: string;
  quantity: number;
  currency: string;
  /** What the customer pays per interval */
  amount: number;
  interval: 'year';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  latest_invoice_status: 'paid' | 'open' | 'payment_failed';
  last_payment_error?: string;
  metadata: Record<string, string>;
  created: string;
}

// ── Slack ───────────────────────────────────────────────────

export interface SlackUser {
  /** e.g. "U04SAMLIND" */
  id: string;
  name: string;
  real_name: string;
  email: string | null;
  title: string;
  is_bot?: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  purpose: string;
}

export interface SlackMessage {
  ts: string;
  /** Channel ID, or a user ID for a direct message */
  channel: string;
  user: string;
  text: string;
  postedAt: string;
  threadTs: string | null;
}
