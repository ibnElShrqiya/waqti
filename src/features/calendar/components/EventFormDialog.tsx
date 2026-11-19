import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { findEventConflicts, localDateTimeToIso, type CalendarDisplayItem } from '@/domain/calendar';
import type { Calendar, CalendarEvent, Task } from '@/domain/types';
import { useCalendarMutations } from '@/features/calendar/api/useCalendar';
import { useI18n } from '@/i18n';
import { toDayKey } from '@/lib/date';
import { toast } from '@/stores/toast';
import { Button, Dialog, Field, Input, Select, Switch, Textarea } from '@/components/ui';

const EVENT_COLORS = ['#176B56', '#2D699B', '#D1AD70', '#B93C34', '#6D4C9B'];

function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  calendars: Calendar[];
  tasks: Task[];
  existingItems: CalendarDisplayItem[];
  defaultStart?: Date;
  defaultTaskId?: string;
}

export function EventFormDialog({
  open,
  onClose,
  event,
  calendars,
  tasks,
  existingItems,
  defaultStart,
  defaultTaskId,
}: EventFormDialogProps) {
  const { t } = useI18n();
  const mutations = useCalendarMutations();
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [color, setColor] = useState(EVENT_COLORS[0]!);
  const [calendarId, setCalendarId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitleError(null);
    if (event) {
      const s = new Date(event.startAt);
      const e = new Date(event.endAt);
      setTitle(event.title);
      setDescription(event.description ?? '');
      setLocation(event.location ?? '');
      setAllDay(event.allDay);
      setStartDate(toDayKey(s));
      setStartTime(toTimeInput(s));
      setEndDate(toDayKey(e));
      setEndTime(toTimeInput(e));
      setTimezone(event.timezone);
      setColor(event.color);
      setCalendarId(event.calendarId ?? '');
      setTaskId(event.taskId ?? '');
    } else {
      const base = defaultStart ?? new Date();
      const end = new Date(base.getTime() + 60 * 60_000);
      const prelinked = defaultTaskId ? tasks.find((x) => x.id === defaultTaskId) : undefined;
      setTitle(prelinked?.title ?? '');
      setDescription(prelinked?.notes ?? '');
      setLocation('');
      setAllDay(false);
      setStartDate(toDayKey(base));
      setStartTime(toTimeInput(base));
      setEndDate(toDayKey(end));
      setEndTime(toTimeInput(end));
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
      setColor(EVENT_COLORS[0]!);
      setCalendarId(calendars.find((c) => c.isDefault)?.id ?? calendars[0]?.id ?? '');
      setTaskId(defaultTaskId ?? '');
    }
  }, [open, event, defaultStart, defaultTaskId, calendars, tasks]);

  const conflicts = useMemo(() => {
    if (!startDate || !endDate || allDay) return [];
    const sIso = localDateTimeToIso(startDate, startTime || '09:00');
    const eIso = localDateTimeToIso(endDate, endTime || '10:00');
    return findEventConflicts(
      { id: event?.id, start: new Date(sIso), end: new Date(eIso), allDay },
      existingItems,
    );
  }, [startDate, startTime, endDate, endTime, allDay, event?.id, existingItems]);

  const isPending = mutations.createEvent.isPending || mutations.updateEvent.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(t('quickAdd.titleRequired'));
      titleRef.current?.focus();
      return;
    }

    const sIso = allDay
      ? localDateTimeToIso(startDate, '00:00')
      : localDateTimeToIso(startDate, startTime || '09:00');
    let eIso = allDay
      ? localDateTimeToIso(endDate || startDate, '23:59')
      : localDateTimeToIso(endDate || startDate, endTime || '10:00');
    if (new Date(eIso).getTime() < new Date(sIso).getTime()) {
      eIso = new Date(new Date(sIso).getTime() + 30 * 60_000).toISOString();
    }

    try {
      if (event) {
        await mutations.updateEvent.mutateAsync({
          id: event.id,
          patch: {
            calendarId: calendarId || null,
            title: title.trim(),
            description: description.trim() || null,
            location: location.trim() || null,
            startAt: sIso,
            endAt: eIso,
            allDay,
            timezone,
            color,
            taskId: taskId || null,
          },
        });
        toast.success(t('calendar.updated'));
      } else {
        await mutations.createEvent.mutateAsync({
          calendarId: calendarId || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          startAt: sIso,
          endAt: eIso,
          allDay,
          timezone,
          color,
          taskId: taskId || undefined,
        });
        toast.success(t('calendar.created'));
      }
      onClose();
    } catch {
      toast.error(t('quickAdd.error'));
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    await mutations.deleteEvent.mutateAsync(event.id);
    toast.success(t('calendar.deleted'));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={event ? t('calendar.editEvent') : t('calendar.newEvent')}
      variant="sheet"
      closeLabel={t('common.close')}
      initialFocusRef={titleRef}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {event ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              leadingIcon={<Trash2 />}
              onClick={() => void handleDelete()}
              disabled={mutations.deleteEvent.isPending}
            >
              {t('calendar.deleteEvent')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form={`${id}-form`} loading={isPending}>
              {t('calendar.save')}
            </Button>
          </div>
        </div>
      }
    >
      <form id={`${id}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {conflicts.length > 0 ? (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-2.5 text-xs text-warning"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {t('calendar.conflictWarning', {
                titles: conflicts.map((c) => c.title).join(', '),
              })}
            </span>
          </div>
        ) : null}

        <Field label={t('calendar.eventTitle')} htmlFor={`${id}-title`} error={titleError ?? undefined}>
          <Input
            ref={titleRef}
            id={`${id}-title`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            placeholder={t('calendar.eventTitlePlaceholder')}
            aria-invalid={Boolean(titleError)}
            required
          />
        </Field>

        <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 py-2.5">
          <span className="text-sm font-medium text-ink">{t('calendar.allDay')}</span>
          <Switch checked={allDay} onChange={setAllDay} label={t('calendar.allDay')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('calendar.startDate')} htmlFor={`${id}-sdate`}>
            <Input id={`${id}-sdate`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          {!allDay ? (
            <Field label={t('calendar.startTime')} htmlFor={`${id}-stime`}>
              <Input id={`${id}-stime`} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
          ) : null}
          <Field label={t('calendar.endDate')} htmlFor={`${id}-edate`}>
            <Input id={`${id}-edate`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          {!allDay ? (
            <Field label={t('calendar.endTime')} htmlFor={`${id}-etime`}>
              <Input id={`${id}-etime`} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('calendar.calendarLabel')} htmlFor={`${id}-cal`}>
            <Select id={`${id}-cal`} value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('calendar.linkedTask')} htmlFor={`${id}-task`}>
            <Select id={`${id}-task`} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              <option value="">{t('calendar.noLinkedTask')}</option>
              {tasks
                .filter((tk) => tk.status !== 'completed')
                .map((tk) => (
                  <option key={tk.id} value={tk.id}>
                    {tk.title}
                  </option>
                ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('calendar.location')} htmlFor={`${id}-loc`} optionalLabel={t('common.optional')}>
            <Input
              id={`${id}-loc`}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('calendar.locationPlaceholder')}
            />
          </Field>

          <Field label={t('calendar.timezone')} htmlFor={`${id}-tz`}>
            <Input id={`${id}-tz`} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">{t('calendar.color')}</span>
          <div className="flex items-center gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`size-7 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-ink' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <Field label={t('calendar.description')} htmlFor={`${id}-desc`} optionalLabel={t('common.optional')}>
          <Textarea id={`${id}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
