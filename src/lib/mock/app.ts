/**
 * The mock systems as one HTTP app, served at /api/mock/*. Every request is
 * recorded in the request log on the Dev tools page.
 */
import { Hono, type MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type RequestLogEntry, updateDb } from '@/lib/db';
import { adminAppRoutes } from './admin-app';
import { kleerRoutes } from './kleer';
import { salesforceRoutes } from './salesforce';
import { slackRoutes } from './slack';
import { stripeRoutes } from './stripe';
import { now } from './validate';

export const MOCK_BASE = '/api/mock';
const LOG_LIMIT = 500;

function parse(text: string): unknown {
  if (text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const requestLog: MiddlewareHandler = async (c, next) => {
  const system = c.req.path.slice(MOCK_BASE.length + 1).split('/')[0];
  const requestText = await c.req.raw.clone().text();
  await next();
  const responseText = await c.res.clone().text();
  const url = new URL(c.req.url);
  updateDb((db) => {
    db.log.push({
      id: (db.log.at(-1)?.id ?? 0) + 1,
      at: now(),
      system: system as RequestLogEntry['system'],
      method: c.req.method,
      path: url.pathname.slice(MOCK_BASE.length) + url.search,
      status: c.res.status,
      requestBody: parse(requestText),
      responseBody: parse(responseText),
      replayed: c.res.headers.get('idempotent-replayed') === 'true',
    });
    if (db.log.length > LOG_LIMIT) db.log = db.log.slice(-LOG_LIMIT);
  });
};

function createMockApp() {
  const app = new Hono().basePath(MOCK_BASE);
  app.use('*', requestLog);
  app.route('/salesforce', salesforceRoutes());
  app.route('/admin', adminAppRoutes());
  app.route('/kleer', kleerRoutes());
  app.route('/stripe', stripeRoutes());
  app.route('/slack', slackRoutes());

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: 'not_found',
          message: `No mock endpoint for ${c.req.method} ${c.req.path}. See docs/apis.md.`,
        },
      },
      404,
    ),
  );
  app.onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ error: { code: 'bad_request', message: error.message } }, error.status);
    }
    console.error(error);
    return c.json({ error: { code: 'internal_error', message: error.message } }, 500);
  });
  return app;
}

export const mockApp = createMockApp();
