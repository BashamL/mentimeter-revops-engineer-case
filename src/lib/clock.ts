/**
 * The case is set on Friday 6 November 2026. The mock systems use this clock,
 * so "today" is never earlier than that, even if you run the app before it.
 */
const CASE_NOW = Date.parse('2026-11-06T15:00:00Z');

export function now(): Date {
  return new Date(Math.max(Date.now(), CASE_NOW));
}

export function today(): string {
  return now().toISOString().slice(0, 10);
}
