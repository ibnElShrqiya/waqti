import { useState, type DragEvent } from 'react';
import { getItemsForDay, getWeekDays, type CalendarDisplayItem } from '@/domain/calendar';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { atTime, isSameDay, toDayKey } from '@/lib/date';
import { Card } from '@/components/ui';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 .. 21:00

export interface CalendarWeeklyViewProps {
  anchorDate: Date;
  now: Date;
  items: CalendarDisplayItem[];
  onSelectItem: (item: CalendarDisplayItem) => void;
  onCreateAt: (start: Date) => void;
  onDropItem: (payload: { kind: 'event' | 'task'; id: string }, targetStart: Date) => void;
}

export function CalendarWeeklyView({
  anchorDate,
  now,
  items,
  onSelectItem,
  onCreateAt,
  onDropItem,
}: CalendarWeeklyViewProps) {
  const { fmt } = useI18n();
  const days = getWeekDays(anchorDate);
  const [dragCell, setDragCell] = useState<string | null>(null);

  const handleDrop = (e: DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragCell(null);
    const raw = e.dataTransfer.getData('application/waqti-cal');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { kind: 'event' | 'task'; id: string };
      onDropItem(parsed, atTime(day, hour, 0));
    } catch {
      // ignore
    }
  };

  return (
    <Card className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Header row */}
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface-2">
          <div className="border-e border-line" />
          {days.map((day) => {
            const isToday = isSameDay(day, now);
            return (
              <div
                key={toDayKey(day)}
                className={cn(
                  'border-e border-line px-2 py-2.5 text-center last:border-e-0',
                  isToday && 'bg-primary-soft/50',
                )}
              >
                <p className="text-2xs font-semibold uppercase tracking-wider text-ink-subtle rtl:tracking-normal">
                  {fmt.weekdayShort(day)}
                </p>
                <p
                  className={cn(
                    'tabular mx-auto mt-1 grid size-7 place-items-center rounded-full text-sm font-semibold',
                    isToday ? 'bg-primary text-primary-fg' : 'text-ink',
                  )}
                >
                  {fmt.number(day.getDate())}
                </p>
              </div>
            );
          })}
        </div>

        {/* Hourly rows */}
        <div className="divide-y divide-line/60">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              <div className="tabular border-e border-line px-2 py-2 text-end text-2xs text-ink-subtle">
                {fmt.time(atTime(anchorDate, hour, 0))}
              </div>
              {days.map((day) => {
                const cellKey = `${toDayKey(day)}-${hour}`;
                const dayItems = getItemsForDay(items, day).filter(
                  (i) => !i.allDay && i.start.getHours() === hour,
                );

                return (
                  <div
                    key={cellKey}
                    onClick={() => {
                      if (dayItems.length === 0) onCreateAt(atTime(day, hour, 0));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragCell(cellKey);
                    }}
                    onDragLeave={() => setDragCell((p) => (p === cellKey ? null : p))}
                    onDrop={(e) => handleDrop(e, day, hour)}
                    className={cn(
                      'min-h-[48px] border-e border-line/60 p-1 transition-colors last:border-e-0',
                      dragCell === cellKey && 'bg-primary-soft/60',
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      {dayItems.map((item) => {
                        const mins = Math.max(
                          30,
                          Math.round((item.end.getTime() - item.start.getTime()) / 60_000),
                        );
                        return (
                          <button
                            key={item.id}
                            type="button"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectItem(item);
                            }}
                            title={`${item.title} (${fmt.duration(mins)})`}
                            className="w-full truncate rounded-lg px-2 py-1 text-start text-2xs font-medium text-white shadow-xs transition-opacity hover:opacity-90"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
