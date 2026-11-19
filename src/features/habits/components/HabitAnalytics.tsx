import { useMemo } from 'react';
import { BarChart3, Flame } from 'lucide-react';
import { buildHabitHeatmap } from '@/domain/habits';
import type { Habit, HabitLog } from '@/domain/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fromDayKey } from '@/lib/date';
import { Card, CardBody, CardHeader } from '@/components/ui';

export interface HabitAnalyticsProps {
  habits: Habit[];
  logs: HabitLog[];
  todayKey: string;
  bestCurrentStreak: number;
  bestLongestStreak: number;
  monthlyRate: number;
  totalCompleted: number;
}

export function HabitAnalytics({
  habits,
  logs,
  todayKey,
  bestCurrentStreak,
  bestLongestStreak,
  monthlyRate,
  totalCompleted,
}: HabitAnalyticsProps) {
  const { t, fmt } = useI18n();
  const weekCells = useMemo(() => buildHabitHeatmap(habits, logs, 7, todayKey), [habits, logs, todayKey]);
  const heatmapCells = useMemo(() => buildHabitHeatmap(habits, logs, 84, todayKey), [habits, logs, todayKey]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('habitsModule.currentStreak')}</p>
          <p className="tabular mt-1.5 flex items-center gap-1.5 font-display text-2xl font-bold text-ink">
            <Flame className="size-5 text-accent-strong" aria-hidden />
            {fmt.number(bestCurrentStreak)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('habitsModule.longestStreak')}</p>
          <p className="tabular mt-1.5 font-display text-2xl font-bold text-ink">
            {fmt.number(bestLongestStreak)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('habitsModule.completionRate30')}</p>
          <p className="tabular mt-1.5 font-display text-2xl font-bold text-primary dark:text-primary-strong">
            {fmt.percent(monthlyRate)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('habitsModule.totalCompleted')}</p>
          <p className="tabular mt-1.5 font-display text-2xl font-bold text-ink">
            {fmt.number(totalCompleted)}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('habitsModule.weeklyChart')} icon={<BarChart3 />} />
        <CardBody className="pt-4">
          <div className="grid grid-cols-7 items-end gap-2">
            {weekCells.map((cell, i) => {
              const isToday = i === weekCells.length - 1;
              const heightPct = Math.max(8, Math.round(cell.ratio * 100));
              const d = fromDayKey(cell.date);
              return (
                <div key={cell.date} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      title={`${fmt.weekdayShort(d)}: ${fmt.number(cell.completedCount)}/${fmt.number(cell.scheduledCount)}`}
                      style={{ height: `${heightPct}%` }}
                      className={cn(
                        'w-full max-w-[20px] rounded-t-md transition-all',
                        isToday ? 'bg-primary' : 'bg-primary/35',
                      )}
                    />
                  </div>
                  <span className={cn('text-2xs', isToday ? 'font-semibold text-primary' : 'text-ink-subtle')}>
                    {fmt.weekdayNarrow(d)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('habitsModule.heatmapTitle')} />
        <CardBody className="pt-4">
          <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
            {heatmapCells.map((cell) => {
              const tone =
                cell.ratio === 0
                  ? 'bg-sunken'
                  : cell.ratio < 0.5
                    ? 'bg-primary/25'
                    : cell.ratio < 1
                      ? 'bg-primary/60'
                      : 'bg-primary';
              return (
                <span
                  key={cell.date}
                  title={`${cell.date}: ${cell.completedCount}/${cell.scheduledCount}`}
                  className={cn('size-3 rounded-[3px]', tone)}
                />
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
