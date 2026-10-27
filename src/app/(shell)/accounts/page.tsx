import type { Metadata } from 'next';
import Link from 'next/link';
import { Status } from '@/components/data/status';
import { Page, PageHeader } from '@/components/shell/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { salesforce } from '@/lib/connectors';

export const metadata: Metadata = { title: 'Accounts' };

export default async function AccountsPage() {
  const [accounts, users] = await Promise.all([salesforce.listAccounts(), salesforce.listUsers()]);
  const sorted = [...accounts].sort((a, b) => a.Name.localeCompare(b.Name));
  return (
    <Page>
      <PageHeader title="Accounts" description="Companies in Salesforce." />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Workspace</TableHead>
              <TableHead>PO required</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((a) => (
              <TableRow key={a.Id}>
                <TableCell>
                  <Link href={`/accounts/${a.Id}`} className="font-medium hover:underline">
                    {a.Name}
                  </Link>
                  <div className="text-muted-foreground text-xs">{a.Industry}</div>
                </TableCell>
                <TableCell>
                  <Status value={a.Type} tone={a.Type === 'Customer' ? 'good' : 'neutral'} />
                </TableCell>
                <TableCell className="text-sm">{a.BillingCountry}</TableCell>
                <TableCell className="text-sm">{a.CurrencyIsoCode}</TableCell>
                <TableCell className="text-sm">
                  {users.find((u) => u.Id === a.OwnerId)?.Name}
                </TableCell>
                <TableCell className="font-mono text-xs">{a.Workspace_ID__c ?? ''}</TableCell>
                <TableCell className="text-sm">{a.PO_Required__c ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Page>
  );
}
