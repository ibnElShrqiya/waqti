import { CheckCircle2, CircleDot, ListChecks, Timer } from 'lucide-react';
import type { TaskStats } from '@/domain/tasks';
import type { FocusSummary } from '@/domain/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui';

export interface StatCardsProps {
  stats: TaskStats;
  focus: FocusSummary;
}

export function StatCards({ stats, focus }: StatCardsProps) {
  const { t, tp, fmt } = useI18n();

  const items = [
    {
      id: 'total',
      label: t('dashboard.stats.total'),
      value: fmt.number(stats.total),
      hint: t('dashboard.stats.totalHint'),
      icon: ListChecks,
      tone: 'bg-primary-soft text-primary dark:text-primary-strong',
    },
    {
      id: 'completed',
      label: t('dashboard.stats.completed'),
      value: fmt.number(stats.completed),
      hint: t('dashboard.stats.completedHint', { percent: fmt.percent(stats.completionRate) }),
      icon: CheckCircle2,
      tone: 'bg-success-soft text-success',
    },
    {
      id: 'pending',
      label: t('dashboard.stats.pending'),
      value: fmt.number(stats.pending),
      hint: tp('dashboard.stats.pendingHint', stats.pendingImportant),
      icon: CircleDot,
      tone: 'bg-warning-soft text-warning',
    },
    {
      id: 'focus',
      label: t('dashboard.stats.focus'),
      value: fmt.duration(focus.todayMinutes),
      hint: t('dashboard.stats.focusHint', { goal: fmt.duration(focus.goalMinutes) }),
      icon: Timer,
      tone: 'bg-accent-soft text-accent-strong',
    },
  ];

  return (
    <section aria-label={t('dashboard.title')} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.id} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted">{item.label}</span>
              <span className={cn('grid size-8 shrink-0 place-items-center rounded-xl', item.tone)}>
                <Icon className="size-4" aria-hidden />
              </span>
            </div>
            <p className="tabular mt-2.5 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.625rem]">
              {item.value}
            </p>
            <p className="mt-1 truncate text-xs text-ink-subtle">{item.hint}</p>
          </Card>
        );
      })}
    </section>
  );
}
