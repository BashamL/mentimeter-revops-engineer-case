import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import * as clock from '@/lib/clock';

/** A problem with one field, or null when it's fine. */
export type Check = string | null;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export const check = {
  text: (value: unknown, field: string): Check =>
    typeof value === 'string' && value.trim() !== '' ? null : `${field} is required`,
  optionalText: (value: unknown, field: string): Check =>
    value === undefined || value === null || typeof value === 'string'
      ? null
      : `${field} must be text or null`,
  email: (value: unknown, field: string): Check =>
    typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
      ? null
      : `${field} must be an email address`,
  date: (value: unknown, field: string): Check =>
    isIsoDate(value) ? null : `${field} must be a date like 2026-11-15`,
  optionalDate: (value: unknown, field: string): Check =>
    value === undefined || value === null || isIsoDate(value)
      ? null
      : `${field} must be a date like 2026-11-15`,
  positiveInteger: (value: unknown, field: string): Check =>
    Number.isInteger(value) && (value as number) > 0
      ? null
      : `${field} must be a whole number above 0`,
  number: (value: unknown, field: string, min = 0): Check =>
    typeof value === 'number' && Number.isFinite(value) && value >= min
      ? null
      : `${field} must be a number, at least ${min}`,
  oneOf: (value: unknown, field: string, options: readonly string[]): Check =>
    typeof value === 'string' && options.includes(value)
      ? null
      : `${field} must be one of ${options.join(', ')}`,
  dateOrder: (start: unknown, end: unknown, field: string): Check =>
    isIsoDate(start) && isIsoDate(end) && end < start ? `${field} ends before it starts` : null,
};

export function problems(...checks: Check[]): string[] {
  return checks.filter((c): c is string => c !== null);
}

/** The request body as an object, or a 400 if it isn't one. */
export async function body(c: Context): Promise<Record<string, unknown>> {
  const text = await c.req.text();
  if (text.trim() === '') return {};
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new HTTPException(400, { message: 'The body is not valid JSON' });
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new HTTPException(400, { message: 'The body must be a JSON object' });
  }
  return value as Record<string, unknown>;
}

export function now(): string {
  return clock.now().toISOString();
}

export function today(): string {
  return clock.today();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The last day of a one-year period starting on `start`. */
export function oneYearFrom(start: string): string {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return addDays(d.toISOString().slice(0, 10), -1);
}

/** The admin app and Kleer answer errors like this. */
export function appError(
  c: Context,
  status: 404 | 409 | 422,
  code: string,
  message: string,
  list: string[] = [],
) {
  return c.json({ error: { code, message, problems: list } }, status);
}
