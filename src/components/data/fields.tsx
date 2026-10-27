import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A grid of label and value pairs, like a Salesforce record page. */
export function Fields({
  items,
  columns = 3,
}: {
  items: [label: string, value: ReactNode][];
  columns?: 2 | 3;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2',
        columns === 3 && 'lg:grid-cols-3',
      )}
    >
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="break-words">
            {value === null || value === undefined || value === '' ? (
              <span className="text-muted-foreground">None</span>
            ) : (
              value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function Json({ value }: { value: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md border bg-muted/50 p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
