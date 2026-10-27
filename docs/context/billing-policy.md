# How finance bills

Finance's rules for setting up and billing a Closed Won deal. Rules R1 to R8
come from the finance team's checklist. Where a rule is unclear, make an
assumption and write it down in `SUBMISSION.md`.

## Rules

| Rule | What it says |
| ---- | ------------ |
| R1 | Payment method 'Invoice' goes to Kleer. Payment method 'Card' goes to Stripe. |
| R2 | Card payments are only allowed when the first-year amount is 10,000 EUR or less (or the same amount in another currency). Above that, the deal must be paid by invoice. |
| R3 | If the account requires a PO, nothing is sent to Kleer until a PO number is present. |
| R4 | Every invoice needs a legal entity name and a billing email. EU customers outside Sweden also need a VAT ID. |
| R5 | A deal must only create one subscription and one invoice or payment, even if Salesforce sends it more than once. |
| R6 | Add-on deals update the existing subscription instead of creating a new one. Added licenses are co-termed with the existing subscription end date and prorated by day. |
| R7 | If a customer moves from an existing subscription to a new plan, the old subscription must be ended so they are not billed twice. |
| R8 | Amount = licenses x list price per license x (1 - discount), in the account's currency. |

## What each system needs

| System | Object | Required fields |
| ------ | ------ | --------------- |
| Admin app | Subscription | Account, workspace (create one if none exists), plan, seats, start date, end date, billing system (Kleer or Stripe) |
| Kleer | Invoice | Legal entity name, billing email, VAT number (if required), currency, line items (plan, licenses, unit price, discount), amount, service period, PO number (if required), payment terms (30 days) |
| Stripe | Customer and subscription | Customer name, billing email, currency, plan, licenses, amount, start date |

## Other things finance does today

- Payment terms are 30 days on every invoice.
- Multi-year deals are invoiced one year at a time unless the contract says
  "Paid upfront".
- Discounts above 25% need Deal Desk approval before the deal is booked.
- Maja reads every Kleer draft before it goes to the customer.
- When an invoice is wrong after it's sent, finance credits it in full and
  sends a new one. It never edits a sent invoice.
- Kleer decides VAT from the customer's country and VAT number. An EU customer
  invoiced without a VAT number gets charged Swedish VAT, which they then
  dispute.
