import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { taskAnchorDate } from '@/domain/tasks';
import type { Task } from '@/domain/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { addDays, isSameDay, toDayKey } from '@/lib/date';
import { Button, Card } from '@/components/ui';

export interface TasksCalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onCreateForDate: (dayKey: string) => void;
}

export function TasksCalendarView({ tasks, onSelectTask, onCreateForDate }: TasksCalendarViewProps) {
  const { t, fmt, locale } = useI18n();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en-US', {
        month: 'long',
        year: 'numeric',
      }).format(cursor),
    [cursor, locale],
  );

  const days = useMemo(() => {
    const startWeekday = cursor.getDay();
    const gridStart = addDays(cursor, -startWeekday);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor]);

  const weekdays = useMemo(() => {
    const sunday = new Date(2026, 10, 15);
    return Array.from({ length: 7 }, (_, i) => fmt.weekdayShort(addDays(sunday, i)));
  }, [fmt]);

  const unscheduled = useMemo(() => tasks.filter((task) => !taskAnchorDate(task)), [tasks]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink sm:text-lg">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t('tasks.calendarPrev')}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft className="rtl:-scale-x-100" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            >
              {t('common.today')}
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={t('tasks.calendarNext')}
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <ChevronRight className="rtl:-scale-x-100" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-2xs font-semibold uppercase tracking-wider text-ink-subtle rtl:tracking-normal">
          {weekdays.map((wd) => (
            <div key={wd} className="py-1.5">
              {wd}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = isSameDay(day, today);
            const dayKey = toDayKey(day);
            const dayTasks = tasks.filter((task) => {
              const anchor = taskAnchorDate(task);
              return anchor ? isSameDay(anchor, day) : false;
            });

            return (
              <div
                key={dayKey}
                className={cn(
                  'group flex min-h-[90px] flex-col rounded-xl border p-1.5 transition-colors sm:min-h-[108px]',
                  inMonth ? 'border-line/80 bg-surface-2' : 'border-line/40 bg-sunken/30 opacity-60',
                  isToday && 'border-primary/60 ring-1 ring-primary/30',
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'tabular grid size-6 place-items-center rounded-full text-xs font-medium',
                      isToday ? 'bg-primary text-primary-fg' : 'text-ink-muted',
                    )}
                  >
                    {fmt.number(day.getDate())}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCreateForDate(dayKey)}
                    aria-label={t('tasks.newTask')}
                    className="grid size-5 place-items-center rounded-md text-ink-subtle opacity-0 transition-opacity hover:bg-sunken hover:text-ink group-hover:opacity-100 focus:opacity-100"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="mt-1 flex flex-col gap-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onSelectTask(task)}
                      className={cn(
                        'truncate rounded-md px-1.5 py-0.5 text-start text-2xs font-medium transition-colors',
                        task.status === 'completed'
                          ? 'bg-sunken text-ink-subtle line-through'
                          : task.priority === 'urgent'
                            ? 'bg-danger-soft text-danger'
                            : 'bg-primary-soft text-primary dark:text-primary-strong',
                      )}
                    >
                      {task.title}
                    </button>
                  ))}
                  {dayTasks.length > 3 ? (
                    <span className="px-1 text-2xs text-ink-subtle">+{fmt.number(dayTasks.length - 3)}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {unscheduled.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-ink">{t('tasks.calendarNoDate')}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {unscheduled.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task)}
                className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-ink hover:border-line-strong"
              >
                {task.title}
              </button>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
