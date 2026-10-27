# The data

It's Friday 6 November 2026. Between Monday and Friday, 18 deals were marked
Closed Won in Salesforce. Nobody has set them up in the admin app or billed
them yet. The seed data in `data/seed/` holds that week, plus some history in
every system.

| System     | What's in it                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------- |
| Salesforce | 23 accounts, 27 contacts, 13 users, 25 opportunities (this week's deals, older won deals and open pipeline), the products and price book, and 21 events from this week |
| Admin app  | 10 workspaces and 6 subscriptions                                                                  |
| Kleer      | 4 customers, 5 invoices and 1 credit note                                                         |
| Stripe     | 2 customers with card subscriptions                                                               |
| Slack      | 4 channels, the team, and recent messages                                                         |

The data is as realistic as we could make it, which means some of it is
wrong.

## How the systems connect

- A Salesforce **account** is a customer company. Its `Workspace_ID__c` points
  to the customer's workspace in the admin app, and `Kleer_Customer_Number__c`
  to its customer in Kleer, when someone filled them in.
- An admin app **workspace** has a `salesforceAccountId` when it's linked to
  an account. Workspaces people created self-service are not linked.
- An admin app **subscription** belongs to a workspace. `billingSystem` says
  whether Kleer or Stripe bills it, and `billingReference` holds the invoice
  number or Stripe subscription ID.
- Stripe customers and subscriptions carry the workspace in
  `metadata.workspace_id`.
- Salesforce users and Slack users share the same work email.

## Opportunity fields

| Field | Meaning |
| ----- | ------- |
| `RecordType.DeveloperName` | `New` (new business), `Add_on` (more licenses on an existing subscription) or `Renewal` |
| `StageName` | `Closed Won`, or an open stage such as `Proposal` or `Negotiation` |
| `Amount`, `CurrencyIsoCode` | The deal value as the rep entered it |
| `Plan__c` | Product code: `PRO` or `ENT` |
| `Number_of_Licenses__c` | Licenses sold on this deal. On an add-on, the licenses added. |
| `Total_Licenses__c` | Licenses the customer has after this deal |
| `Price_per_License_per_Year__c` | List price per license per year in the deal's currency |
| `Discount__c` | Percent off list price |
| `Discount_Approval__c` | `Not required`, `Pending` or `Approved` |
| `Contract_Term__c` | `12 months`, `24 months` or `Co-term` |
| `Start_Date__c`, `End_Date__c` | The contract period. The end date is the last day. |
| `Multi_Year_deal__c`, `Multi_Year_Payment_Terms__c` | Multi-year deals, `Invoiced annually` or `Paid upfront` |
| `Payment_Method__c` | `Invoice` or `Card` |
| `Credit_Card_Payment__c` | A legacy checkbox from the old quote template |
| `PO_Number__c` | The customer's purchase order number |
| `Billing_Contact__c` | The contact who receives invoices |
| `Original_Opportunity__c` | The deal this one renews or adds to |
| `Subscription_ID__c`, `Invoice_Number__c` | Empty until someone sets the deal up |
| `OpportunityLineItems` | The products on the deal: quantity, list price, discount and total |

## Account fields

| Field | Meaning |
| ----- | ------- |
| `Legal_Entity_Name__c` | The name to invoice |
| `VAT_Number__c` | The customer's VAT number |
| `Invoice_Email__c` | Where invoices go |
| `PO_Required__c` | The customer needs a PO number on every invoice |
| `CurrencyIsoCode` | The account's currency |
| `BillingCountry`, `Region__c` | Where the customer is |
| `OwnerId`, `CSM__c` | The account owner and the Customer Success Manager |

## Products and prices

| Code | Product | Billed | SEK | EUR | USD | GBP | Min licenses |
| ---- | ------- | ------ | --: | --: | --: | --: | -----------: |
| PRO | Pro | Per license per year | 2,700 | 240 | 260 | 210 | 1 |
| ENT | Enterprise | Per license per year | 4,000 | 360 | 390 | 310 | 25 |
| ONB | Onboarding package | Once | 15,000 | 1,300 | 1,400 | 1,150 | |

## IDs

Salesforce IDs are 18 characters and start with the object's prefix: `001`
accounts, `003` contacts, `005` users, `006` opportunities. New records in
the other systems get IDs in sequence, so a run from reset state always
produces the same ones.
