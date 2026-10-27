import { Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { Page } from '@/components/shell/page';

export const metadata: Metadata = { title: 'Your app' };

// Replace this page with whatever you build. Rename it in src/apps/registry.ts.
export default function YourAppPage() {
  return (
    <Page>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-10 text-center">
        <Sparkles className="size-8 text-primary" />
        <h1 className="font-semibold text-xl">This page is yours</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          Build what you think makes the Closed Won hand-off better.
        </p>
        <p className="font-mono text-muted-foreground text-xs">src/app/(shell)/your-app/page.tsx</p>
      </div>
    </Page>
  );
}
