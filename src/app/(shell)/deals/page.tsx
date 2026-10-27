import type { Metadata } from 'next';
import { DealsTable } from '@/components/data/deals-table';
import { TabsNav } from '@/components/data/tabs-nav';
import { Page, PageHeader } from '@/components/shell/page';
import { salesforce } from '@/lib/connectors';
import { CASE_WEEK_START } from '@/lib/format';

export const metadata: Metadata = { title: 'Deals' };

export default async function DealsPage(props: PageProps<'/deals'>) {
  const { view } = await props.searchParams;
  const active = view === 'all' ? 'all' : view === 'open' ? 'open' : 'won';
  const [opportunities, accounts, users] = await Promise.all([
    salesforce.listOpportunities(),
    salesforce.listAccounts(),
    salesforce.listUsers(),
  ]);
  const won = opportunities.filter(
    (o) => o.StageName === 'Closed Won' && o.CloseDate >= CASE_WEEK_START,
  );
  const open = opportunities.filter((o) => !o.IsClosed);
  const shown = (active === 'won' ? won : active === 'open' ? open : opportunities).sort((a, b) =>
    b.CloseDate.localeCompare(a.CloseDate),
  );

  return (
    <Page>
      <PageHeader title="Deals" description="Opportunities in Salesforce." />
      <TabsNav
        active={active}
        tabs={[
          { id: 'won', label: 'Closed Won this week', href: '/deals', count: won.length },
          { id: 'open', label: 'Open', href: '/deals?view=open', count: open.length },
          { id: 'all', label: 'All', href: '/deals?view=all', count: opportunities.length },
        ]}
      />
      <DealsTable opportunities={shown} accounts={accounts} users={users} />
    </Page>
  );
}
