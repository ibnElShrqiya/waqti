import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { isSupabaseActive } from '@/data';
import { PRIORITIES, type Priority } from '@/domain/types';
import { useCreateTask } from '@/features/dashboard/api/mutations';
import { useI18n } from '@/i18n';
import { fromDayKey, toDayKey } from '@/lib/date';
import { toast } from '@/stores/toast';
import { useUI } from '@/stores/ui';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui';

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function QuickAddTaskDialog() {
  const { t, fmt } = useI18n();
  const open = useUI((s) => s.quickAddOpen);
  const close = useUI((s) => s.closeQuickAdd);
  const createTask = useCreateTask();

  const titleRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [date, setDate] = useState(() => toDayKey(new Date()));
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setPriority('medium');
      setDate(toDayKey(new Date()));
      setTime('');
      setDuration('');
      setNotes('');
      setTitleError(null);
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(t('quickAdd.titleRequired'));
      titleRef.current?.focus();
      return;
    }

    const startAt = date && time ? fromDayKey(date, time).toISOString() : undefined;
    const dueAt = date ? fromDayKey(date, time || '23:59').toISOString() : undefined;
    const estimatedMinutes = duration ? Number(duration) : undefined;

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        notes: notes.trim() || undefined,
        priority,
        startAt,
        dueAt,
        estimatedMinutes,
      });
      toast.success(isSupabaseActive ? t('quickAdd.success') : t('quickAdd.successDemo'));
      close();
    } catch {
      toast.error(t('quickAdd.error'));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={t('quickAdd.title')}
      description={t('quickAdd.description')}
      variant="sheet"
      closeLabel={t('common.close')}
      initialFocusRef={titleRef}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={createTask.isPending}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={`${baseId}-form`} loading={createTask.isPending}>
            {createTask.isPending ? t('quickAdd.submitting') : t('quickAdd.submit')}
          </Button>
        </>
      }
    >
      <form id={`${baseId}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field
          label={t('quickAdd.titleLabel')}
          htmlFor={`${baseId}-title`}
          error={titleError ?? undefined}
        >
          <Input
            ref={titleRef}
            id={`${baseId}-title`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            placeholder={t('quickAdd.titlePlaceholder')}
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? `${baseId}-title-error` : undefined}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('priority.label')} htmlFor={`${baseId}-priority`}>
            <Select
              id={`${baseId}-priority`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`priority.${p}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('quickAdd.dateLabel')} htmlFor={`${baseId}-date`}>
            <Input
              id={`${baseId}-date`}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>

          <Field label={t('quickAdd.timeLabel')} htmlFor={`${baseId}-time`} optionalLabel={t('common.optional')}>
            <Input
              id={`${baseId}-time`}
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </Field>

          <Field
            label={t('quickAdd.durationLabel')}
            htmlFor={`${baseId}-duration`}
            optionalLabel={t('common.optional')}
          >
            <Select
              id={`${baseId}-duration`}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="">{t('quickAdd.durationNone')}</option>
              {DURATIONS.map((mins) => (
                <option key={mins} value={mins}>
                  {fmt.duration(mins)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t('quickAdd.notesLabel')} htmlFor={`${baseId}-notes`} optionalLabel={t('common.optional')}>
          <Textarea
            id={`${baseId}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('quickAdd.notesPlaceholder')}
          />
        </Field>
      </form>
    </Dialog>
  );
}
