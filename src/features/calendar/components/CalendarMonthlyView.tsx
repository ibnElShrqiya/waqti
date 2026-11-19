import { Plus } from 'lucide-react';
import { getItemsForDay, getMonthGridDays, type CalendarDisplayItem } from '@/domain/calendar';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { addDays, isSameDay, toDayKey } from '@/lib/date';
import { Badge, Card } from '@/components/ui';

export interface CalendarMonthlyViewProps {
  anchorDate: Date;
  selectedDate: Date;
  now: Date;
  items: CalendarDisplayItem[];
  onSelectDate: (date: Date) => void;
  onSelectItem: (item: CalendarDisplayItem) => void;
  onCreateAt: (start: Date) => void;
}

export function CalendarMonthlyView({
  anchorDate,
  selectedDate,
  now,
  items,
  onSelectDate,
  onSelectItem,
  onCreateAt,
}: CalendarMonthlyViewProps) {
  const { t, tp, fmt } = useI18n();
  const days = getMonthGridDays(anchorDate);
  const sunday = new Date(2026, 10, 15);
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt.weekdayShort(addDays(sunday, i)));
  const selectedDayItems = getItemsForDay(items, selectedDate);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-3 sm:p-5">
        <div className="grid grid-cols-7 gap-1 text-center text-2xs font-semibold uppercase tracking-wider text-ink-subtle rtl:tracking-normal">
          {weekdays.map((wd) => (
            <div key={wd} className="py-1.5">
              {wd}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = day.getMonth() === anchorDate.getMonth();
            const isToday = isSameDay(day, now);
            const isSelected = isSameDay(day, selectedDate);
            const dayItems = getItemsForDay(items, day);
            const taskCount = dayItems.filter((i) => i.kind === 'task').length;

            return (
              <div
                key={toDayKey(day)}
                onClick={() => onSelectDate(day)}
                className={cn(
                  'group flex min-h-[86px] cursor-pointer flex-col rounded-xl border p-1.5 transition-colors sm:min-h-[104px]',
                  inMonth ? 'border-line/80 bg-surface-2' : 'border-line/40 bg-sunken/30 opacity-60',
                  isSelected && 'border-primary ring-1 ring-primary/40',
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'tabular grid size-6 place-items-center rounded-full text-xs font-medium',
                      isToday ? 'bg-primary text-primary-fg' : 'text-ink-muted',
                    )}
                  >
                    {fmt.number(day.getDate())}
                  </span>
                  {taskCount > 0 ? (
                    <span className="hidden rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary dark:text-primary-strong sm:inline">
                      {tp('calendar.tasksCount', taskCount)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex flex-col gap-1">
                  {dayItems.slice(0, 2).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      className="truncate rounded-md px-1.5 py-0.5 text-start text-2xs font-medium text-white"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.title}
                    </button>
                  ))}
                  {dayItems.length > 2 ? (
                    <span className="px-1 text-2xs text-ink-subtle">+{fmt.number(dayItems.length - 2)}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">{fmt.longDate(selectedDate)}</h3>
          <button
            type="button"
            onClick={() => onCreateAt(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 9, 0))}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink hover:border-line-strong"
          >
            <Plus className="size-3.5" />
            <span>{t('calendar.newEvent')}</span>
          </button>
        </div>

        {selectedDayItems.length === 0 ? (
          <p className="mt-3 text-xs text-ink-subtle">{t('calendar.noEventsDay')}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {selectedDayItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2 text-start hover:border-line-strong"
                  style={{ borderInlineStartWidth: '4px', borderInlineStartColor: item.color }}
                >
                  <span className="truncate text-sm font-medium text-ink">{item.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.kind === 'task' ? <Badge tone="primary">{t('calendar.taskBadge')}</Badge> : null}
                    <span className="tabular text-xs text-ink-subtle">
                      {item.allDay ? t('calendar.allDayBadge') : `${fmt.time(item.start)} – ${fmt.time(item.end)}`}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
