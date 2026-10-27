import { Hash, User } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { EmptyState, Page, PageHeader } from '@/components/shell/page';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { slack } from '@/lib/connectors';
import { formatDateTime, initials } from '@/lib/format';
import { slackText } from '@/lib/slack-text';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Slack' };

export default async function SlackPage(props: PageProps<'/slack'>) {
  const { channel } = await props.searchParams;
  const [channels, users, direct] = await Promise.all([
    slack.listChannels(),
    slack.listUsers(),
    slack.listDirectMessages(),
  ]);
  const directIds = direct.map((d) => d.user);
  const selected = typeof channel === 'string' ? channel : (channels[0]?.id ?? '');
  const isDirect = directIds.includes(selected);
  const messages = await slack.history(selected).catch(() => []);
  const person = (id: string) => users.find((u) => u.id === id);
  const title = isDirect
    ? `Direct messages to ${person(selected)?.real_name ?? selected}`
    : `#${channels.find((c) => c.id === selected)?.name ?? ''}`;

  return (
    <Page>
      <PageHeader title="Slack" />
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-1 text-sm">
          <div className="px-2 pb-1 font-medium text-muted-foreground text-xs">Channels</div>
          {channels.map((c) => (
            <Link
              key={c.id}
              href={`/slack?channel=${c.id}`}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted',
                c.id === selected && 'bg-muted font-medium',
              )}
            >
              <Hash className="size-3.5 text-muted-foreground" />
              {c.name}
            </Link>
          ))}
          <div className="px-2 pt-4 pb-1 font-medium text-muted-foreground text-xs">
            Direct messages
          </div>
          {directIds.length === 0 ? (
            <div className="px-2 text-muted-foreground text-xs">None yet</div>
          ) : null}
          {directIds.map((id) => (
            <Link
              key={id}
              href={`/slack?channel=${id}`}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted',
                id === selected && 'bg-muted font-medium',
              )}
            >
              <User className="size-3.5 text-muted-foreground" />
              {person(id)?.real_name ?? id}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-4">
          <h2 className="font-medium">{title}</h2>
          {messages.length === 0 ? <EmptyState>No messages yet.</EmptyState> : null}
          {messages.map((m) => {
            const author = person(m.user);
            const name = author?.real_name ?? 'Your app';
            return (
              <div key={m.ts} className="flex gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">
                    {author ? initials(name) : 'APP'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="text-sm">
                    <span className="font-medium">{name}</span>{' '}
                    <span className="text-muted-foreground text-xs">
                      {formatDateTime(m.postedAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{slackText(m.text, users)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
