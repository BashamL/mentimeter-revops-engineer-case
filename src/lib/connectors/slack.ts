import type { SlackChannel, SlackMessage, SlackUser } from '@/lib/systems/types';
import { request } from './http';

export const slack = {
  /**
   * Posts a message. `channel` is a channel ID, a "#channel-name", or a user ID
   * for a direct message.
   */
  postMessage: async (input: { channel: string; text: string; thread_ts?: string }) =>
    (
      await request<{ ok: true; message: SlackMessage }>('slack', 'POST', '/chat.postMessage', {
        body: input,
      })
    ).message,

  /** Finds a person by their work email, e.g. a Salesforce user's Email. */
  lookupUserByEmail: async (email: string) =>
    (
      await request<{ ok: true; user: SlackUser }>('slack', 'GET', '/users.lookupByEmail', {
        query: { email },
      })
    ).user,

  listUsers: async () =>
    (await request<{ ok: true; members: SlackUser[] }>('slack', 'GET', '/users.list')).members,

  listChannels: async () =>
    (await request<{ ok: true; channels: SlackChannel[] }>('slack', 'GET', '/conversations.list'))
      .channels,

  /** People your app has sent direct messages to. */
  listDirectMessages: async () =>
    (
      await request<{ ok: true; channels: { id: string; user: string; is_im: true }[] }>(
        'slack',
        'GET',
        '/conversations.list',
        { query: { types: 'im' } },
      )
    ).channels,

  /** Newest first. `channel` is a channel ID, or a user ID for direct messages. */
  history: async (channel: string) =>
    (
      await request<{ ok: true; messages: SlackMessage[] }>(
        'slack',
        'GET',
        '/conversations.history',
        {
          query: { channel },
        },
      )
    ).messages,
};
