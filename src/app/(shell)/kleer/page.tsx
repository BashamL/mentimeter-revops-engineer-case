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
import { today as clockToday } from '@/lib/clock';
import { kleer } from '@/lib/connectors';
import { formatDate, formatMoney } from '@/lib/format';

export const metadata: Metadata = { title: 'Kleer' };

export default async function KleerPage(props: PageProps<'/kleer'>) {
  const { tab } = await props.searchParams;
  const active = tab === 'customers' ? 'customers' : 'invoices';
  const [invoices, customers] = await Promise.all([kleer.findInvoices(), kleer.findCustomers()]);
  const today = clockToday();
  const status = (i: (typeof invoices)[number]) =>
    i.status === 'sent' && i.dueDate < today ? 'overdue' : i.status;

  return (
    <Page>
      <PageHeader title="Kleer" description="Invoicing, for customers who pay by invoice." />
      <TabsNav
        active={active}
        tabs={[
          { id: 'invoices', label: 'Invoices', href: '/kleer', count: invoices.length },
          {
            id: 'customers',
            label: 'Customers',
            href: '/kleer?tab=customers',
            count: customers.length,
          },
        ]}
      />
      <div className="rounded-lg border">
        {active === 'invoices' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Lines</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>References</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...invoices].reverse().map((i) => (
                <TableRow key={i.invoiceNumber}>
                  <TableCell>
                    <div className="font-mono text-xs">{i.invoiceNumber}</div>
                    {i.type === 'credit_note' ? (
                      <div className="text-muted-foreground text-xs">
                        Credit note for {i.creditsInvoice}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {customers.find((c) => c.customerNumber === i.customerNumber)?.name}
                    <div className="text-muted-foreground text-xs">#{i.customerNumber}</div>
                  </TableCell>
                  <TableCell className="max-w-72 text-xs">
                    {i.lines.map((l) => (
                      <div key={`${l.articleNumber}-${l.description}`}>
                        {l.quantity} x {l.articleNumber} at {l.unitPrice}
                        {l.discountPercent ? `, ${l.discountPercent}% off` : ''}
                      </div>
                    ))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(i.netAmount, i.currency)}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {i.vatRate}%
                    <div className="text-muted-foreground text-xs">
                      {formatMoney(i.vatAmount, i.currency)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>Invoiced {formatDate(i.invoiceDate)}</div>
                    <div className="text-muted-foreground">Due {formatDate(i.dueDate)}</div>
                    <div className="text-muted-foreground">
                      Service {formatDate(i.servicePeriod.start)} to{' '}
                      {formatDate(i.servicePeriod.end)}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {i.poNumber ? <div>PO {i.poNumber}</div> : null}
                    {i.yourReference ? (
                      <div className="text-muted-foreground">Your ref: {i.yourReference}</div>
                    ) : null}
                    {i.foreignId ? (
                      <div className="font-mono text-muted-foreground">{i.foreignId}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Status value={status(i)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>VAT number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.customerNumber}>
                  <TableCell className="font-mono text-xs">{c.customerNumber}</TableCell>
                  <TableCell className="text-sm">{c.name}</TableCell>
                  <TableCell className="text-sm">{c.vatNumber}</TableCell>
                  <TableCell className="text-sm">{c.email}</TableCell>
                  <TableCell className="text-sm">{c.country}</TableCell>
                  <TableCell className="text-sm">{c.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Page>
  );
}
