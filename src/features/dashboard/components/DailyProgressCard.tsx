import { ArrowRight, Flame, Sparkles, Timer } from 'lucide-react';
import type { TaskStats } from '@/domain/tasks';
import type { TimelineItem } from '@/domain/timeline';
import type { FocusSummary, HabitSummary } from '@/domain/types';
import { useI18n } from '@/i18n';
import { ProgressRing } from '@/components/ui';

export interface DailyProgressCardProps {
  stats: TaskStats;
  habits: HabitSummary[];
  focus: FocusSummary;
  nextItem?: TimelineItem;
}

export function DailyProgressCard({ stats, habits, focus, nextItem }: DailyProgressCardProps) {
  const { t, tp, fmt } = useI18n();
  const habitsDone = habits.filter((h) => h.completedToday).length;

  const statusLine =
    stats.total === 0
      ? t('dashboard.progress.noTasks')
      : stats.pending === 0
        ? t('dashboard.progress.allDone')
        : t('dashboard.progress.completedOf', {
            done: fmt.number(stats.completed),
            total: fmt.number(stats.total),
          });

  return (
    <section
      aria-labelledby="daily-progress-heading"
      className="relative overflow-hidden rounded-3xl bg-hero p-6 text-hero-fg shadow-card sm:p-7"
    >
      {/* Subtle ambient glow — restrained, no heavy gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute -end-20 -top-24 size-64 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5 sm:gap-6">
          <ProgressRing
            value={stats.completionRate}
            label={t('dashboard.progress.title')}
            size={112}
            stroke={9}
            trackClassName="stroke-hero-line/15"
            indicatorClassName="stroke-accent"
            className="shrink-0"
          >
            <div className="text-center">
              <span className="tabular font-display text-2xl font-bold text-hero-fg">
                {fmt.percent(stats.completionRate)}
              </span>
            </div>
          </ProgressRing>

          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.1em] text-accent rtl:tracking-normal">
              <Sparkles className="size-3.5" aria-hidden />
              {t('dashboard.progress.title')}
            </p>
            <h2 id="daily-progress-heading" className="mt-1.5 text-lg font-semibold leading-snug text-hero-fg sm:text-xl">
              {statusLine}
            </h2>
            {stats.total > 0 && stats.pending > 0 ? (
              <p className="mt-1 text-sm text-hero-muted">
                {tp('dashboard.progress.remaining', stats.pending)}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-hero-muted">
              <span className="inline-flex items-center gap-1.5">
                <Timer className="size-3.5 text-accent" aria-hidden />
                <span>
                  {t('dashboard.progress.focusToday')}:{' '}
                  <strong className="tabular font-semibold text-hero-fg">{fmt.duration(focus.todayMinutes)}</strong>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flame className="size-3.5 text-accent" aria-hidden />
                <span>
                  {t('dashboard.progress.habitsToday')}:{' '}
                  <strong className="tabular font-semibold text-hero-fg">
                    {fmt.number(habitsDone)}/{fmt.number(habits.length)}
                  </strong>
                </span>
              </span>
            </div>
          </div>
        </div>

        {nextItem ? (
          <div className="rounded-2xl border border-hero-line/15 bg-white/[0.06] px-4 py-3 sm:min-w-[230px] sm:max-w-xs">
            <p className="text-2xs font-medium uppercase tracking-[0.1em] text-hero-muted rtl:tracking-normal">
              {t('dashboard.progress.nextUp')}
            </p>
            <p className="mt-1 truncate font-display text-sm font-semibold text-hero-fg">{nextItem.title}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-accent tabular">
              <span>{fmt.time(nextItem.start)}</span>
              {nextItem.end ? (
                <>
                  <ArrowRight className="size-3 rtl:-scale-x-100" aria-hidden />
                  <span>{fmt.time(nextItem.end)}</span>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
