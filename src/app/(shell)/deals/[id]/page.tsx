import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fields } from '@/components/data/fields';
import { Status } from '@/components/data/status';
import { EmptyState, Page, PageHeader, Section } from '@/components/shell/page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminApp, ConnectorError, kleer, salesforce } from '@/lib/connectors';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';

/** Fields every opportunity has. Anything else was written back by an integration. */
const STANDARD_FIELDS = new Set([
  'Id',
  'Name',
  'AccountId',
  'RecordType',
  'StageName',
  'IsClosed',
  'IsWon',
  'CloseDate',
  'Amount',
  'CurrencyIsoCode',
  'OwnerId',
  'Plan__c',
  'Number_of_Licenses__c',
  'Total_Licenses__c',
  'Price_per_License_per_Year__c',
  'Discount__c',
  'Contract_Term__c',
  'Start_Date__c',
  'End_Date__c',
  'Multi_Year_deal__c',
  'Multi_Year_Payment_Terms__c',
  'Payment_Method__c',
  'Credit_Card_Payment__c',
  'PO_Number__c',
  'Billing_Contact__c',
  'Discount_Approval__c',
  'Original_Opportunity__c',
  'Subscription_ID__c',
  'Invoice_Number__c',
  'Description',
  'CreatedDate',
  'LastModifiedDate',
  'OpportunityLineItems',
]);

const yesNo = (value: unknown) => (value ? 'Yes' : 'No');

export default async function DealPage(props: PageProps<'/deals/[id]'>) {
  const { id } = await props.params;
  const opportunity = await salesforce.getOpportunity(id).catch((error) => {
    if (error instanceof ConnectorError && error.status === 404) notFound();
    throw error;
  });
  const [account, users, feed, subscriptions, invoices] = await Promise.all([
    salesforce.getAccount(opportunity.AccountId),
    salesforce.listUsers(),
    salesforce.listEvents(),
    adminApp.listSubscriptions({ salesforceAccountId: opportunity.AccountId }),
    kleer.findInvoices({ foreignId: opportunity.Id }),
  ]);
  const contact = opportunity.Billing_Contact__c
    ? await salesforce.getContact(opportunity.Billing_Contact__c).catch(() => null)
    : null;
  const original = opportunity.Original_Opportunity__c
    ? await salesforce.getOpportunity(opportunity.Original_Opportunity__c).catch(() => null)
    : null;
  const owner = users.find((u) => u.Id === opportunity.OwnerId);
  const events = feed.events.filter((e) => e.opportunityId === opportunity.Id);
  const custom = Object.entries(opportunity).filter(([key]) => !STANDARD_FIELDS.has(key));
  const money = (n: number | null) => formatMoney(n, opportunity.CurrencyIsoCode);

  return (
    <Page>
      <PageHeader
        eyebrow={
          <Link href={`/accounts/${account.Id}`} className="hover:underline">
            {account.Name}
          </Link>
        }
        title={opportunity.Name}
        actions={
          <>
            <Badge variant="outline">{opportunity.RecordType.Name}</Badge>
            <Status value={opportunity.StageName} />
          </>
        }
      />

      <Card>
        <CardContent>
          <Fields
            items={[
              ['Amount', money(opportunity.Amount)],
              ['Close date', formatDate(opportunity.CloseDate)],
              ['Owner', owner ? `${owner.Name} (${owner.UserRole.Name})` : opportunity.OwnerId],
              ['Plan', opportunity.Plan__c],
              ['Licenses on this deal', opportunity.Number_of_Licenses__c],
              ['Total licenses after this deal', opportunity.Total_Licenses__c],
              ['List price per license per year', money(opportunity.Price_per_License_per_Year__c)],
              ['Discount', opportunity.Discount__c === null ? null : `${opportunity.Discount__c}%`],
              ['Discount approval', opportunity.Discount_Approval__c],
              ['Contract term', opportunity.Contract_Term__c],
              ['Start date', formatDate(opportunity.Start_Date__c)],
              ['End date', formatDate(opportunity.End_Date__c)],
              ['Multi-year deal', yesNo(opportunity.Multi_Year_deal__c)],
              ['Multi-year payment terms', opportunity.Multi_Year_Payment_Terms__c],
              [
                'Original opportunity',
                original ? (
                  <Link
                    key="original"
                    href={`/deals/${original.Id}`}
                    className="text-primary hover:underline"
                  >
                    {original.Name}
                  </Link>
                ) : null,
              ],
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Billing">
          <Card>
            <CardContent>
              <Fields
                columns={2}
                items={[
                  ['Payment method', opportunity.Payment_Method__c],
                  ['Credit card payment (legacy)', yesNo(opportunity.Credit_Card_Payment__c)],
                  ['PO number', opportunity.PO_Number__c],
                  ['Billing contact', contact ? `${contact.Name}, ${contact.Email}` : null],
                  ['Legal entity', account.Legal_Entity_Name__c],
                  ['VAT number', account.VAT_Number__c],
                  ['Invoice email', account.Invoice_Email__c],
                  ['PO required', yesNo(account.PO_Required__c)],
                  ['Country', account.BillingCountry],
                ]}
              />
            </CardContent>
          </Card>
        </Section>
        <Section title="Hand-off">
          <Card>
            <CardContent>
              <Fields
                columns={2}
                items={[
                  ['Subscription_ID__c', opportunity.Subscription_ID__c],
                  ['Invoice_Number__c', opportunity.Invoice_Number__c],
                  ...custom.map(
                    ([key, value]) =>
                      [key, value === null ? null : String(value)] as [string, string | null],
                  ),
                ]}
              />
            </CardContent>
          </Card>
        </Section>
      </div>

      {opportunity.Description ? (
        <Section title="Description">
          <p className="rounded-lg border p-4 text-sm">{opportunity.Description}</p>
        </Section>
      ) : null}

      <Section title="Products" count={opportunity.OpportunityLineItems.totalSize}>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">List price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunity.OpportunityLineItems.records.map((line) => (
                <TableRow key={line.Id}>
                  <TableCell>
                    {line.Name}{' '}
                    <span className="font-mono text-muted-foreground text-xs">
                      {line.ProductCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{line.Quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(line.UnitPrice)}</TableCell>
                  <TableCell className="text-right tabular-nums">{line.Discount}%</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(line.TotalPrice)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Salesforce events" count={events.length}>
          {events.length === 0 ? (
            <EmptyState>No events for this deal.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {events.map((e) => (
                <li key={e.replayId} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">
                      #{e.replayId} {e.type}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(e.occurredAt)}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Changed: {e.changedFields.join(', ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="In other systems">
          <div className="flex flex-col gap-2 text-sm">
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>
                  Admin app <span className="font-mono">{s.id}</span>: {s.seats} {s.plan},{' '}
                  {formatDate(s.startDate)} to {formatDate(s.endDate)}
                </span>
                <Status value={s.status} />
              </div>
            ))}
            {invoices.map((i) => (
              <div
                key={i.invoiceNumber}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span>
                  Kleer <span className="font-mono">{i.invoiceNumber}</span>:{' '}
                  {formatMoney(i.totalAmount, i.currency)}
                </span>
                <Status value={i.status} />
              </div>
            ))}
            {subscriptions.length + invoices.length === 0 ? (
              <EmptyState>
                Nothing for this account in the admin app, and no Kleer invoice for this deal.
              </EmptyState>
            ) : null}
          </div>
        </Section>
      </div>
    </Page>
  );
}
