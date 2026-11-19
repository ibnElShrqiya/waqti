import { Flame, Play, Timer } from 'lucide-react';
import type { FocusSummary } from '@/domain/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fromDayKey } from '@/lib/date';
import { ButtonLink, Card, CardBody, CardHeader, ProgressBar } from '@/components/ui';

export interface FocusStatsCardProps {
  focus: FocusSummary;
}

export function FocusStatsCard({ focus }: FocusStatsCardProps) {
  const { t, tp, fmt } = useI18n();
  const ratio = focus.goalMinutes > 0 ? focus.todayMinutes / focus.goalMinutes : 0;
  const maxMinutes = Math.max(focus.goalMinutes, ...focus.week.map((d) => d.minutes), 60);
  const weekTotal = focus.week.reduce((sum, d) => sum + d.minutes, 0);

  return (
    <Card>
      <CardHeader
        title={t('dashboard.focus.title')}
        icon={<Timer />}
        action={
          <ButtonLink to="/focus" variant="secondary" size="sm" leadingIcon={<Play />}>
            {t('dashboard.focus.start')}
          </ButtonLink>
        }
      />

      <CardBody className="flex flex-col gap-4 pt-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="tabular font-display text-2xl font-bold text-ink">
                {fmt.duration(focus.todayMinutes)}
              </span>
              <span className="ms-2 text-xs text-ink-subtle">
                {t('dashboard.focus.goal', { goal: fmt.duration(focus.goalMinutes) })}
              </span>
            </div>
            <span className="tabular text-xs font-semibold text-primary dark:text-primary-strong">
              {fmt.percent(Math.min(1, ratio))}
            </span>
          </div>
          <ProgressBar value={ratio} label={t('dashboard.focus.today')} className="mt-2.5" />
          <div className="mt-2.5 flex items-center justify-between text-xs text-ink-muted">
            <span>{tp('dashboard.focus.sessions', focus.sessionsToday)}</span>
            <span className="inline-flex items-center gap-1 font-medium text-accent-strong">
              <Flame className="size-3.5" aria-hidden />
              {tp('dashboard.focus.streak', focus.streakDays)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-line/70 bg-surface-2 p-3.5">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-medium text-ink-muted">{t('dashboard.focus.week')}</span>
            <span className="tabular text-ink-subtle">
              {t('dashboard.focus.weekTotal', { total: fmt.duration(weekTotal) })}
            </span>
          </div>
          <div className="grid grid-cols-7 items-end gap-2">
            {focus.week.map((day, i) => {
              const isToday = i === focus.week.length - 1;
              const heightPct = Math.max(8, Math.round((day.minutes / maxMinutes) * 100));
              const dateObj = fromDayKey(day.date);
              return (
                <div key={day.date} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-16 w-full items-end justify-center">
                    <div
                      title={`${fmt.weekdayShort(dateObj)}: ${fmt.duration(day.minutes)}`}
                      style={{ height: `${heightPct}%` }}
                      className={cn(
                        'w-full max-w-[18px] rounded-t-md transition-all',
                        isToday ? 'bg-primary' : 'bg-primary/30 dark:bg-primary/35',
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-2xs',
                      isToday ? 'font-semibold text-primary dark:text-primary-strong' : 'text-ink-subtle',
                    )}
                  >
                    {fmt.weekdayNarrow(dateObj)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
