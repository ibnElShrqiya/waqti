import { useState, type DragEvent } from 'react';
import { AlertTriangle, MapPin, Minus, Plus } from 'lucide-react';
import { findEventConflicts, getItemsForDay, type CalendarDisplayItem } from '@/domain/calendar';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { atTime, isSameDay } from '@/lib/date';
import { Badge, Card } from '@/components/ui';

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 05:00 .. 23:00

export interface CalendarDailyViewProps {
  date: Date;
  now: Date;
  items: CalendarDisplayItem[];
  onSelectItem: (item: CalendarDisplayItem) => void;
  onCreateAt: (start: Date) => void;
  onDropItem: (payload: { kind: 'event' | 'task'; id: string }, targetStart: Date) => void;
  onResizeEvent?: (eventId: string, deltaMinutes: number) => void;
}

export function CalendarDailyView({
  date,
  now,
  items,
  onSelectItem,
  onCreateAt,
  onDropItem,
  onResizeEvent,
}: CalendarDailyViewProps) {
  const { t, fmt } = useI18n();
  const [dragHour, setDragHour] = useState<number | null>(null);
  const dayItems = getItemsForDay(items, date);
  const allDayItems = dayItems.filter((i) => i.allDay);
  const timedItems = dayItems.filter((i) => !i.allDay);
  const isToday = isSameDay(date, now);
  const currentHour = now.getHours();

  const handleDrop = (e: DragEvent, hour: number) => {
    e.preventDefault();
    setDragHour(null);
    const raw = e.dataTransfer.getData('application/waqti-cal');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { kind: 'event' | 'task'; id: string };
      onDropItem(parsed, atTime(date, hour, 0));
    } catch {
      // ignore invalid drag payload
    }
  };

  return (
    <Card className="overflow-hidden">
      {allDayItems.length > 0 ? (
        <div className="border-b border-line bg-surface-2 px-4 py-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-ink-subtle rtl:tracking-normal">
            {t('calendar.allDayBadge')}
          </p>
          <div className="flex flex-wrap gap-2">
            {allDayItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-white shadow-xs"
                style={{ backgroundColor: item.color }}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-line/70">
        {HOURS.map((hour) => {
          const slotStart = atTime(date, hour, 0);
          const slotItems = timedItems.filter((i) => i.start.getHours() === hour);
          const isCurrentHour = isToday && currentHour === hour;

          return (
            <div
              key={hour}
              onDragOver={(e) => {
                e.preventDefault();
                setDragHour(hour);
              }}
              onDragLeave={() => setDragHour((prev) => (prev === hour ? null : prev))}
              onDrop={(e) => handleDrop(e, hour)}
              className={cn(
                'group relative flex min-h-[60px] transition-colors',
                dragHour === hour && 'bg-primary-soft/50',
                isCurrentHour && 'bg-accent-soft/25',
              )}
            >
              <button
                type="button"
                onClick={() => onCreateAt(slotStart)}
                className="tabular w-16 shrink-0 border-e border-line/70 px-2 py-2 text-end text-xs text-ink-subtle hover:text-primary sm:w-20"
              >
                {fmt.time(slotStart)}
              </button>

              <div
                onClick={() => {
                  if (slotItems.length === 0) onCreateAt(slotStart);
                }}
                className="relative flex flex-1 flex-col gap-1.5 p-2"
              >
                {isCurrentHour ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex items-center"
                  >
                    <span className="size-2 rounded-full bg-accent" />
                    <span className="h-0.5 flex-1 bg-accent/70" />
                  </div>
                ) : null}

                {slotItems.map((item) => {
                  const hasConflict = findEventConflicts(
                    { id: item.id, start: item.start, end: item.end, allDay: item.allDay },
                    timedItems,
                  ).length > 0;

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/waqti-cal',
                          JSON.stringify({
                            kind: item.kind,
                            id: item.kind === 'event' ? item.event!.id : item.task!.id,
                          }),
                        );
                      }}
                      className="flex items-start justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 shadow-xs transition-colors hover:border-line-strong"
                      style={{ borderInlineStartWidth: '4px', borderInlineStartColor: item.color }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        className="min-w-0 flex-1 text-start"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-ink">{item.title}</span>
                          {item.kind === 'task' ? (
                            <Badge tone="primary">{t('calendar.taskBadge')}</Badge>
                          ) : null}
                          {hasConflict ? (
                            <Badge tone="warning">
                              <AlertTriangle aria-hidden />
                              <span>!</span>
                            </Badge>
                          ) : null}
                        </div>
                        <p className="tabular mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-subtle">
                          <span>
                            {fmt.time(item.start)} – {fmt.time(item.end)}
                          </span>
                          {item.event?.location ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" aria-hidden />
                              {item.event.location}
                            </span>
                          ) : null}
                        </p>
                      </button>

                      {item.kind === 'event' && onResizeEvent ? (
                        <div className="flex shrink-0 items-center gap-1 opacity-70 hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => onResizeEvent(item.event!.id, -15)}
                            aria-label="-15 min"
                            className="grid size-6 place-items-center rounded-md border border-line bg-surface text-ink-muted hover:text-ink"
                          >
                            <Minus className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onResizeEvent(item.event!.id, 15)}
                            aria-label="+15 min"
                            className="grid size-6 place-items-center rounded-md border border-line bg-surface text-ink-muted hover:text-ink"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
