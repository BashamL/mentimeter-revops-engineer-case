import type { Metadata } from 'next';
import { Status } from '@/components/data/status';
import { TabsNav } from '@/components/data/tabs-nav';
import { Page, PageHeader } from '@/components/shell/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { stripe } from '@/lib/connectors';
import { formatDate, formatMoney } from '@/lib/format';

export const metadata: Metadata = { title: 'Stripe' };

export default async function StripePage(props: PageProps<'/stripe'>) {
  const { tab } = await props.searchParams;
  const active = tab === 'customers' ? 'customers' : 'subscriptions';
  const [subscriptions, customers] = await Promise.all([
    stripe.listSubscriptions(),
    stripe.findCustomers(),
  ]);

  return (
    <Page>
      <PageHeader title="Stripe" description="Card payments." />
      <TabsNav
        active={active}
        tabs={[
          {
            id: 'subscriptions',
            label: 'Subscriptions',
            href: '/stripe',
            count: subscriptions.length,
          },
          {
            id: 'customers',
            label: 'Customers',
            href: '/stripe?tab=customers',
            count: customers.length,
          },
        ]}
      />
      <div className="rounded-lg border">
        {active === 'subscriptions' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Per year</TableHead>
                <TableHead>Current period</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="text-sm">
                    {customers.find((c) => c.id === s.customer)?.name}
                    <div className="font-mono text-muted-foreground text-xs">{s.customer}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.quantity} {s.plan}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(s.amount, s.currency)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(s.current_period_start)} to {formatDate(s.current_period_end)}
                    <div className="text-muted-foreground text-xs">
                      {s.status === 'canceled'
                        ? `Canceled ${formatDate(s.canceled_at)}`
                        : s.cancel_at_period_end
                          ? 'Ends at period end'
                          : 'Renews automatically'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Status value={s.status} />
                    {s.last_payment_error ? (
                      <div className="mt-1 max-w-56 text-muted-foreground text-xs">
                        {s.last_payment_error}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">
                    {c.name}
                    <div className="font-mono text-muted-foreground text-xs">{c.id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell className="text-sm uppercase">{c.currency}</TableCell>
                  <TableCell className="text-sm">
                    {c.default_payment_method
                      ? `${c.default_payment_method.brand} ${c.default_payment_method.last4}, expires ${c.default_payment_method.exp_month}/${c.default_payment_method.exp_year}`
                      : 'None'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {Object.entries(c.metadata)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(', ')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Page>
  );
}
