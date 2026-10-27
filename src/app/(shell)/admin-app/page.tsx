import type { Metadata } from 'next';
import Link from 'next/link';
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
import { adminApp, salesforce } from '@/lib/connectors';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Admin app' };

export default async function AdminAppPage(props: PageProps<'/admin-app'>) {
  const { tab } = await props.searchParams;
  const active = tab === 'workspaces' ? 'workspaces' : 'subscriptions';
  const [subscriptions, workspaces, accounts] = await Promise.all([
    adminApp.listSubscriptions(),
    adminApp.listWorkspaces(),
    salesforce.listAccounts(),
  ]);
  const account = (id: string | null) => accounts.find((a) => a.Id === id);
  const workspace = (id: string) => workspaces.find((w) => w.id === id);
  const accountCell = (id: string | null) => {
    const found = account(id);
    return found ? (
      <Link href={`/accounts/${found.Id}`} className="hover:underline">
        {found.Name}
      </Link>
    ) : (
      <span className="text-muted-foreground">Not linked</span>
    );
  };

  return (
    <Page>
      <PageHeader
        title="Admin app"
        description="Mentimeter's internal app for workspaces and subscriptions."
      />
      <TabsNav
        active={active}
        tabs={[
          {
            id: 'subscriptions',
            label: 'Subscriptions',
            href: '/admin-app',
            count: subscriptions.length,
          },
          {
            id: 'workspaces',
            label: 'Workspaces',
            href: '/admin-app?tab=workspaces',
            count: workspaces.length,
          },
        ]}
      />
      <div className="rounded-lg border">
        {active === 'subscriptions' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Seats</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Created by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell className="text-sm">
                    {workspace(s.workspaceId)?.name}
                    <div className="font-mono text-muted-foreground text-xs">{s.workspaceId}</div>
                  </TableCell>
                  <TableCell className="text-sm">{accountCell(s.salesforceAccountId)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.seats} {s.plan}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(s.startDate)} to {formatDate(s.endDate)}
                    {s.autoRenew ? (
                      <div className="text-muted-foreground text-xs">Renews automatically</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Status value={s.status} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.billingSystem}
                    <div className="font-mono text-muted-foreground text-xs">
                      {s.billingReference}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{s.createdBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{w.name}</div>
                    <div className="font-mono text-muted-foreground text-xs">{w.id}</div>
                  </TableCell>
                  <TableCell className="text-sm">{accountCell(w.salesforceAccountId)}</TableCell>
                  <TableCell className="text-sm">{w.domain}</TableCell>
                  <TableCell>
                    <Status value={w.plan} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{w.activeMembers}</TableCell>
                  <TableCell className="text-sm">{w.region}</TableCell>
                  <TableCell className="text-sm">{formatDate(w.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Page>
  );
}
