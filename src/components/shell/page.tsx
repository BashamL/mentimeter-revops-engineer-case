import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 p-6', className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow ? <div className="text-muted-foreground text-sm">{eyebrow}</div> : null}
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-muted-foreground text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Section({
  title,
  count,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-medium text-base">
          {title}
          {count === undefined ? null : (
            <span className="rounded-full border px-2 font-normal text-muted-foreground text-xs">
              {count}
            </span>
          )}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
      {children}
    </div>
  );
}
