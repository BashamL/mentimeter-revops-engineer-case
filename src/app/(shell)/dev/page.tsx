import type { Metadata } from 'next';
import Link from 'next/link';
import { Json } from '@/components/data/fields';
import { Status } from '@/components/data/status';
import { TabsNav } from '@/components/data/tabs-nav';
import { EmptyState, Page, PageHeader, Section } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { readDb } from '@/lib/db';
import { formatDateTime } from '@/lib/format';
import { clearDeliveries, resetEverything, sendEvents } from './actions';

export const metadata: Metadata = { title: 'Dev tools' };

export default async function DevPage(props: PageProps<'/dev'>) {
  const { tab, reads } = await props.searchParams;
  const active = tab === 'log' ? 'log' : 'events';
  const db = readDb();
  const delivered = new Map(db.deliveries.map((d) => [d.replayId, d]));
  const pending = db.salesforce.events.filter((e) => !delivered.has(e.replayId)).length;
  const log = db.log.filter((e) => reads === '1' || e.method !== 'GET').reverse();

  return (
    <Page>
      <PageHeader
        title="Dev tools"
        actions={
          <form action={resetEverything}>
            <Button variant="outline" type="submit">
              Reset all systems
            </Button>
          </form>
        }
      />
      <TabsNav
        active={active}
        tabs={[
          {
            id: 'events',
            label: 'Salesforce events',
            href: '/dev',
            count: db.salesforce.events.length,
          },
          { id: 'log', label: 'Request log', href: '/dev?tab=log', count: db.log.length },
        ]}
      />

      {active === 'events' ? (
        <Section
          title="Events Salesforce published this week"
          actions={
            <div className="flex gap-2">
              <form action={clearDeliveries}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  disabled={db.deliveries.length === 0}
                >
                  Clear sent
                </Button>
              </form>
              <form action={sendEvents}>
                <input type="hidden" name="mode" value="next" />
                <Button variant="outline" size="sm" type="submit" disabled={pending === 0}>
                  Send next to webhook
                </Button>
              </form>
              <form action={sendEvents}>
                <input type="hidden" name="mode" value="all" />
                <Button size="sm" type="submit" disabled={pending === 0}>
                  Send all {pending} to webhook
                </Button>
              </form>
            </div>
          }
        >
          <p className="text-muted-foreground text-sm">
            Sends to <code className="font-mono">POST /api/webhooks/salesforce</code>. The same
            events are in <code className="font-mono">GET /api/mock/salesforce/events</code>.
          </p>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Changed</TableHead>
                  <TableHead>Webhook</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {db.salesforce.events.map((e) => {
                  const delivery = delivered.get(e.replayId);
                  return (
                    <TableRow key={e.replayId}>
                      <TableCell className="tabular-nums">{e.replayId}</TableCell>
                      <TableCell className="text-sm">{formatDateTime(e.occurredAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{e.type}</TableCell>
                      <TableCell>
                        <Link
                          href={`/deals/${e.opportunityId}`}
                          className="text-sm hover:underline"
                        >
                          {e.opportunity.Name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {e.changedFields.join(', ')}
                      </TableCell>
                      <TableCell>
                        {delivery ? (
                          <Status
                            value={String(delivery.status)}
                            tone={delivery.status < 300 ? 'good' : 'bad'}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">Not sent</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Section>
      ) : (
        <Section
          title="Requests to the mock systems"
          actions={
            <Link
              href={reads === '1' ? '/dev?tab=log' : '/dev?tab=log&reads=1'}
              className="text-primary text-sm hover:underline"
            >
              {reads === '1' ? 'Hide reads' : 'Show reads too'}
            </Link>
          }
        >
          {log.length === 0 ? <EmptyState>No requests yet.</EmptyState> : null}
          <div className="flex flex-col divide-y rounded-lg border">
            {log.map((entry) => (
              <details key={entry.id} className="group px-4 py-2">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                  <span className="w-10 text-muted-foreground text-xs tabular-nums">
                    #{entry.id}
                  </span>
                  <span className="w-20 font-medium capitalize">{entry.system}</span>
                  <code className="font-mono text-xs">
                    {entry.method} {entry.path}
                  </code>
                  <Status value={String(entry.status)} tone={entry.status < 300 ? 'good' : 'bad'} />
                  {entry.replayed ? (
                    <span className="text-muted-foreground text-xs">
                      replayed by idempotency key
                    </span>
                  ) : null}
                  <span className="ml-auto text-muted-foreground text-xs">
                    {formatDateTime(entry.at)}
                  </span>
                </summary>
                <div className="grid gap-3 py-3 md:grid-cols-2">
                  <div>
                    <div className="pb-1 text-muted-foreground text-xs">Request</div>
                    <Json value={entry.requestBody} />
                  </div>
                  <div>
                    <div className="pb-1 text-muted-foreground text-xs">Response</div>
                    <Json value={entry.responseBody} />
                  </div>
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}
    </Page>
  );
}
