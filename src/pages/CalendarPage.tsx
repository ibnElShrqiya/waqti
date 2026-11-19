import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { buildCalendarItems, type CalendarDisplayItem } from '@/domain/calendar';
import type { CalendarEvent, Task } from '@/domain/types';
import { useCalendarEvents, useCalendarMutations, useCalendarsList } from '@/features/calendar/api/useCalendar';
import { CalendarDailyView } from '@/features/calendar/components/CalendarDailyView';
import { CalendarMonthlyView } from '@/features/calendar/components/CalendarMonthlyView';
import { CalendarWeeklyView } from '@/features/calendar/components/CalendarWeeklyView';
import { EventFormDialog } from '@/features/calendar/components/EventFormDialog';
import { useCategoriesList, useTasksList } from '@/features/tasks/api/useTasks';
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog';
import { useNow } from '@/hooks/useNow';
import { useI18n } from '@/i18n';
import { addDays, addMinutes, atTime } from '@/lib/date';
import { toast } from '@/stores/toast';
import { Button, Card, CardBody, CardHeader, ErrorState, SegmentedControl, Skeleton } from '@/components/ui';

type CalendarView = 'day' | 'week' | 'month';

export function CalendarPage() {
  const { t, fmt, locale } = useI18n();
  const now = useNow();
  const calendarsQuery = useCalendarsList();
  const eventsQuery = useCalendarEvents();
  const tasksQuery = useTasksList();
  const categoriesQuery = useCategoriesList();
  const mutations = useCalendarMutations();

  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState(() => new Date());

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | undefined>(undefined);
  const [defaultTaskId, setDefaultTaskId] = useState<string | undefined>(undefined);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const calendars = useMemo(() => calendarsQuery.data ?? [], [calendarsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const items = useMemo(() => buildCalendarItems(events, tasks), [events, tasks]);
  const unscheduledTasks = useMemo(
    () => tasks.filter((tk) => tk.status !== 'completed' && tk.status !== 'deferred' && !tk.startAt),
    [tasks],
  );

  const periodLabel = useMemo(() => {
    const tag = locale === 'ar' ? 'ar-u-nu-latn' : 'en-US';
    if (view === 'day') return fmt.longDate(cursor);
    return new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(cursor);
  }, [view, cursor, fmt, locale]);

  const shiftPeriod = (dir: -1 | 1) => {
    if (view === 'day') setCursor(addDays(cursor, dir));
    else if (view === 'week') setCursor(addDays(cursor, dir * 7));
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
  };

  const openCreateEvent = (start?: Date, taskId?: string) => {
    setEditingEvent(null);
    setDefaultStart(start ?? atTime(cursor, 9, 0));
    setDefaultTaskId(taskId);
    setEventDialogOpen(true);
  };

  const handleSelectItem = (item: CalendarDisplayItem) => {
    if (item.kind === 'event' && item.event) {
      setEditingEvent(item.event);
      setDefaultStart(undefined);
      setDefaultTaskId(undefined);
      setEventDialogOpen(true);
    } else if (item.task) {
      setEditingTask(item.task);
      setTaskDialogOpen(true);
    }
  };

  const handleDropItem = async (payload: { kind: 'event' | 'task'; id: string }, targetStart: Date) => {
    if (payload.kind === 'event') {
      const ev = events.find((e) => e.id === payload.id);
      if (!ev) return;
      const durationMs = Math.max(15 * 60_000, new Date(ev.endAt).getTime() - new Date(ev.startAt).getTime());
      await mutations.updateEvent.mutateAsync({
        id: ev.id,
        patch: {
          startAt: targetStart.toISOString(),
          endAt: new Date(targetStart.getTime() + durationMs).toISOString(),
        },
      });
      toast.success(t('calendar.moved'));
    } else {
      const tk = tasks.find((x) => x.id === payload.id);
      if (!tk) return;
      const mins = tk.estimatedMinutes ?? 30;
      await mutations.scheduleTask.mutateAsync({
        id: tk.id,
        patch: {
          startAt: targetStart.toISOString(),
          endAt: addMinutes(targetStart, mins).toISOString(),
        },
      });
      toast.success(t('calendar.moved'));
    }
  };

  const handleResizeEvent = async (eventId: string, deltaMinutes: number) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const startMs = new Date(ev.startAt).getTime();
    const nextEndMs = Math.max(startMs + 15 * 60_000, new Date(ev.endAt).getTime() + deltaMinutes * 60_000);
    await mutations.updateEvent.mutateAsync({
      id: eventId,
      patch: { endAt: new Date(nextEndMs).toISOString() },
    });
  };

  const isLoading = eventsQuery.isPending || tasksQuery.isPending;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('calendar.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('calendar.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl<CalendarView>
            label={t('calendar.title')}
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: 'day', label: t('calendar.viewDay') },
              { value: 'week', label: t('calendar.viewWeek') },
              { value: 'month', label: t('calendar.viewMonth') },
            ]}
          />
          <Button onClick={() => openCreateEvent()} leadingIcon={<Plus />}>
            {t('calendar.newEvent')}
          </Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-primary dark:text-primary-strong" aria-hidden />
          <h2 className="text-base font-semibold text-ink">{periodLabel}</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" aria-label={t('calendar.prevPeriod')} onClick={() => shiftPeriod(-1)}>
            <ChevronLeft className="rtl:-scale-x-100" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            {t('common.today')}
          </Button>
          <Button variant="outline" size="icon-sm" aria-label={t('calendar.nextPeriod')} onClick={() => shiftPeriod(1)}>
            <ChevronRight className="rtl:-scale-x-100" />
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </Card>
      ) : eventsQuery.isError || tasksQuery.isError ? (
        <ErrorState
          title={t('dashboard.error.title')}
          description={t('dashboard.error.hint')}
          action={<Button onClick={() => void eventsQuery.refetch()}>{t('common.retry')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-9">
            {view === 'day' ? (
              <CalendarDailyView
                date={cursor}
                now={now}
                items={items}
                onSelectItem={handleSelectItem}
                onCreateAt={(start) => openCreateEvent(start)}
                onDropItem={(p, start) => void handleDropItem(p, start)}
                onResizeEvent={(id, delta) => void handleResizeEvent(id, delta)}
              />
            ) : view === 'week' ? (
              <CalendarWeeklyView
                anchorDate={cursor}
                now={now}
                items={items}
                onSelectItem={handleSelectItem}
                onCreateAt={(start) => openCreateEvent(start)}
                onDropItem={(p, start) => void handleDropItem(p, start)}
              />
            ) : (
              <CalendarMonthlyView
                anchorDate={cursor}
                selectedDate={cursor}
                now={now}
                items={items}
                onSelectDate={setCursor}
                onSelectItem={handleSelectItem}
                onCreateAt={(start) => openCreateEvent(start)}
              />
            )}
          </div>

          <aside className="xl:col-span-3">
            <Card>
              <CardHeader
                title={t('calendar.unscheduledTasks')}
                description={t('calendar.unscheduledHint')}
                icon={<Clock />}
              />
              <CardBody className="flex flex-col gap-2 pt-4">
                {unscheduledTasks.length === 0 ? (
                  <p className="text-xs text-ink-subtle">{t('dashboard.upcoming.empty')}</p>
                ) : (
                  unscheduledTasks.map((tk) => (
                    <div
                      key={tk.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/waqti-cal',
                          JSON.stringify({ kind: 'task', id: tk.id }),
                        );
                      }}
                      className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs"
                    >
                      <span className="truncate font-medium text-ink">{tk.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-2xs"
                        onClick={() => openCreateEvent(atTime(cursor, 9, 0), tk.id)}
                      >
                        {t('calendar.scheduleTask')}
                      </Button>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </aside>
        </div>
      )}

      <EventFormDialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        event={editingEvent}
        calendars={calendars}
        tasks={tasks}
        existingItems={items}
        defaultStart={defaultStart}
        defaultTaskId={defaultTaskId}
      />

      <TaskFormDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        task={editingTask ? (tasks.find((x) => x.id === editingTask.id) ?? editingTask) : null}
        categories={categories}
      />
    </div>
  );
}
