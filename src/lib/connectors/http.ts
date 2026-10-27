import { MOCK_BASE, mockApp } from '@/lib/mock/app';

export type SystemName = 'salesforce' | 'admin' | 'kleer' | 'stripe' | 'slack';

/** A system rejected a request. `message` is the system's own explanation. */
export class ConnectorError extends Error {
  readonly system: SystemName;
  readonly status: number;
  readonly code: string;
  /** The field the error is about, when the system says */
  readonly field: string | null;

  constructor(
    system: SystemName,
    status: number,
    code: string,
    message: string,
    field: string | null = null,
  ) {
    super(`${system}: ${message}`);
    this.name = 'ConnectorError';
    this.system = system;
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

/** Each system reports errors in its own shape. */
function toError(system: SystemName, status: number, body: unknown) {
  if (Array.isArray(body)) {
    const [first] = body as { errorCode?: string; message?: string; fields?: string[] }[];
    return new ConnectorError(
      system,
      status,
      first?.errorCode ?? 'error',
      first?.message ?? 'Request failed',
      first?.fields?.[0] ?? null,
    );
  }
  const error = (body as { error?: unknown } | null)?.error;
  if (typeof error === 'string') {
    return new ConnectorError(system, status, error, error);
  }
  const e = (error ?? {}) as { code?: string; message?: string; param?: string };
  return new ConnectorError(
    system,
    status,
    e.code ?? 'error',
    e.message ?? 'Request failed',
    e.param ?? null,
  );
}

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
}

/**
 * Calls a mock system. Requests go straight to the mock app in this process,
 * through the same routes, checks and request log as HTTP calls.
 */
export async function request<T>(
  system: SystemName,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  { body, query, headers }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${MOCK_BASE}/${system}${path}`, 'http://localhost');
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  const response = await mockApp.request(url.pathname + url.search, {
    method,
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text === '' ? null : JSON.parse(text);
  if (!response.ok) throw toError(system, response.status, json);
  // Slack answers 200 with { ok: false } when something goes wrong
  if (system === 'slack' && json?.ok === false) {
    throw toError(system, response.status, json);
  }
  return json as T;
}
