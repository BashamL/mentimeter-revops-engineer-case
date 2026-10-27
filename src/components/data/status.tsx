import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tone = 'good' | 'warn' | 'bad' | 'muted' | 'neutral';

const TONES: Record<Tone, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  bad: 'bg-red-500/10 text-red-700 dark:text-red-400',
  muted: 'bg-muted text-muted-foreground',
  neutral: 'bg-secondary text-secondary-foreground',
};

const BY_VALUE: Record<string, Tone> = {
  'closed won': 'good',
  active: 'good',
  paid: 'good',
  approved: 'good',
  sent: 'neutral',
  draft: 'warn',
  scheduled: 'warn',
  pending: 'warn',
  negotiation: 'warn',
  proposal: 'neutral',
  past_due: 'bad',
  overdue: 'bad',
  payment_failed: 'bad',
  'closed lost': 'bad',
  ended: 'muted',
  cancelled: 'muted',
  canceled: 'muted',
  credited: 'muted',
  credit: 'muted',
  free: 'muted',
};

export function Status({
  value,
  tone,
  className,
}: {
  value: string;
  tone?: Tone;
  className?: string;
}) {
  const resolved = tone ?? BY_VALUE[value.toLowerCase()] ?? 'neutral';
  return (
    <Badge className={cn(TONES[resolved], 'capitalize', className)}>
      {value.replaceAll('_', ' ')}
    </Badge>
  );
}
