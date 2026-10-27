import { notFound } from 'next/navigation';
import { DealsTable } from '@/components/data/deals-table';
import { Fields } from '@/components/data/fields';
import { Status } from '@/components/data/status';
import { EmptyState, Page, PageHeader, Section } from '@/components/shell/page';
import { Card, CardContent } from '@/components/ui/card';
import { adminApp, ConnectorError, kleer, salesforce, stripe } from '@/lib/connectors';
import { formatDate, formatMoney } from '@/lib/format';

export default async function AccountPage(props: PageProps<'/accounts/[id]'>) {
  const { id } = await props.params;
  const account = await salesforce.getAccount(id).catch((error) => {
    if (error instanceof ConnectorError && error.status === 404) notFound();
    throw error;
  });
  const [users, contacts, opportunities, workspaces, subscriptions] = await Promise.all([
    salesforce.listUsers(),
    salesforce.listContacts(account.Id),
    salesforce.listOpportunities({ accountId: account.Id }),
    adminApp.listWorkspaces({ salesforceAccountId: account.Id }),
    adminApp.listSubscriptions({ salesforceAccountId: account.Id }),
  ]);
  const kleerCustomer = account.Kleer_Customer_Number__c
    ? await kleer.getCustomer(account.Kleer_Customer_Number__c).catch(() => null)
    : null;
  const invoices = kleerCustomer
    ? await kleer.findInvoices({ customerNumber: kleerCustomer.customerNumber })
    : [];
  const stripeCustomers = (
    await Promise.all(
      workspaces.map((w) => stripe.findCustomers({ metadata: { workspace_id: w.id } })),
    )
  ).flat();
  const name = (userId: string | null) => users.find((u) => u.Id === userId)?.Name ?? null;

  return (
    <Page>
      <PageHeader
        eyebrow={account.Industry}
        title={account.Name}
        actions={
          <Status value={account.Type} tone={account.Type === 'Customer' ? 'good' : 'neutral'} />
        }
      />
      <Card>
        <CardContent>
          <Fields
            items={[
              ['Legal entity', account.Legal_Entity_Name__c],
              ['VAT number', account.VAT_Number__c],
              ['Invoice email', account.Invoice_Email__c],
              ['PO required', account.PO_Required__c ? 'Yes' : 'No'],
              ['Currency', account.CurrencyIsoCode],
              ['Region', account.Region__c],
              [
                'Billing address',
                `${account.BillingStreet}, ${account.BillingPostalCode} ${account.BillingCity}, ${account.BillingCountry}`,
              ],
              ['Website', account.Website],
              ['Employees', account.NumberOfEmployees.toLocaleString('en-GB')],
              ['Owner', name(account.OwnerId)],
              ['CSM', name(account.CSM__c)],
              ['Workspace ID', account.Workspace_ID__c],
              ['Kleer customer number', account.Kleer_Customer_Number__c],
            ]}
          />
        </CardContent>
      </Card>

      <Section title="Opportunities" count={opportunities.length}>
        <DealsTable opportunities={opportunities} accounts={[account]} users={users} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Contacts" count={contacts.length}>
          <div className="flex flex-col gap-2">
            {contacts.map((c) => (
              <div key={c.Id} className="rounded-lg border p-3 text-sm">
                <div className="font-medium">{c.Name}</div>
                <div className="text-muted-foreground text-xs">
                  {c.Title}, {c.Email}
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="In other systems">
          <div className="flex flex-col gap-2 text-sm">
            {workspaces.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>
                  Workspace <span className="font-mono">{w.id}</span> {w.name}, {w.activeMembers}{' '}
                  members
                </span>
                <Status value={w.plan} />
              </div>
            ))}
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>
                  Subscription <span className="font-mono">{s.id}</span>: {s.seats} {s.plan} until{' '}
                  {formatDate(s.endDate)}, billed by {s.billingSystem}
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
            {stripeCustomers.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                Stripe customer <span className="font-mono">{c.id}</span> {c.email}
              </div>
            ))}
            {workspaces.length + subscriptions.length + invoices.length + stripeCustomers.length ===
            0 ? (
              <EmptyState>Not linked to anything in the admin app, Kleer or Stripe.</EmptyState>
            ) : null}
          </div>
        </Section>
      </div>
    </Page>
  );
}
