/** The week the case is set in: these deals closed Monday 2 to Friday 6 November 2026. */
export const CASE_WEEK_START = '2026-11-02';

export function formatMoney(
  amount: number | null | undefined,
  currency: string | null | undefined,
) {
  if (amount === null || amount === undefined) return '';
  const code = (currency ?? '').toUpperCase();
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('en-GB')} ${code}`;
  }
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm',
  });
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
