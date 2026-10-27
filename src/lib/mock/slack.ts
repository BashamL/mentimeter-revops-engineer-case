/**
 * Mock Slack Web API. Like the real one, it answers 200 even when something
 * goes wrong, with `{ ok: false, error }`.
 */
import { Hono } from 'hono';
import { readDb, updateDb } from '@/lib/db';
import type { SlackMessage } from '@/lib/systems/types';
import { body, now } from './validate';

export function slackRoutes() {
  const app = new Hono();

  app.post('/chat.postMessage', async (c) => {
    const b = await body(c);
    if (typeof b.text !== 'string' || b.text.trim() === '') {
      return c.json({ ok: false, error: 'no_text' });
    }
    if (typeof b.channel !== 'string') {
      return c.json({ ok: false, error: 'channel_not_found' });
    }
    const db = readDb();
    const target = b.channel.replace(/^#/, '');
    const channel = db.slack.channels.find((x) => x.id === target || x.name === target);
    const user = db.slack.users.find((u) => u.id === target);
    if (!channel && !user) return c.json({ ok: false, error: 'channel_not_found' });

    const message = updateDb((next) => {
      const at = now();
      const created: SlackMessage = {
        ts: `${at}#${next.slack.messages.length + 1}`,
        channel: channel?.id ?? (user?.id as string),
        user: 'U04HANDOFF',
        text: b.text as string,
        postedAt: at,
        threadTs: typeof b.thread_ts === 'string' ? b.thread_ts : null,
      };
      next.slack.messages.push(created);
      return created;
    });
    return c.json({ ok: true, channel: message.channel, ts: message.ts, message });
  });

  app.get('/users.lookupByEmail', (c) => {
    const email = c.req.query('email');
    const user = readDb().slack.users.find((u) => u.email && u.email === email);
    return c.json(user ? { ok: true, user } : { ok: false, error: 'users_not_found' });
  });

  app.get('/users.list', (c) => c.json({ ok: true, members: readDb().slack.users }));

  app.get('/conversations.list', (c) => {
    const db = readDb();
    if (c.req.query('types') === 'im') {
      const users = [...new Set(db.slack.messages.map((m) => m.channel))].filter((id) =>
        db.slack.users.some((u) => u.id === id),
      );
      return c.json({
        ok: true,
        channels: users.map((id) => ({ id, user: id, is_im: true })),
      });
    }
    return c.json({ ok: true, channels: db.slack.channels });
  });

  app.get('/conversations.history', (c) => {
    const channel = c.req.query('channel');
    const db = readDb();
    const known =
      db.slack.channels.some((x) => x.id === channel) ||
      db.slack.users.some((u) => u.id === channel);
    if (!known) {
      return c.json({ ok: false, error: 'channel_not_found' });
    }
    return c.json({
      ok: true,
      messages: db.slack.messages.filter((m) => m.channel === channel).reverse(),
    });
  });

  return app;
}
