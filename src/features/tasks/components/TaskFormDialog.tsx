import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import {
  PRIORITIES,
  RECURRENCE_FREQUENCIES,
  TASK_STATUSES,
  type Priority,
  type RecurrenceFrequency,
  type RecurrenceRule,
  type Task,
  type TaskCategory,
  type TaskStatus,
} from '@/domain/types';
import { useTaskMutations } from '@/features/tasks/api/useTasks';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fromDayKey, toDayKey } from '@/lib/date';
import { toast } from '@/stores/toast';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui';

const CATEGORY_COLORS = ['#176B56', '#2D699B', '#D1AD70', '#B93C34', '#6D4C9B'];

function toTimeValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  categories: TaskCategory[];
  defaultDate?: string;
}

export function TaskFormDialog({ open, onClose, task, categories, defaultDate }: TaskFormDialogProps) {
  const { t, fmt } = useI18n();
  const mutations = useTaskMutations();
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('medium');
  const [categoryId, setCategoryId] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [blockDate, setBlockDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [recurrenceFreq, setRecurrenceFreq] = useState<RecurrenceFrequency | 'none'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitleError(null);
    setNewCategoryName('');
    setNewSubtaskTitle('');

    if (task) {
      setTitle(task.title);
      setNotes(task.notes ?? '');
      setStatus(task.status);
      setPriority(task.priority);
      setCategoryId(task.categoryId ?? '');
      setTagsText(task.tags.join(', '));
      setDueDate(task.dueAt ? toDayKey(new Date(task.dueAt)) : '');
      setDueTime(toTimeValue(task.dueAt));
      setBlockDate(task.startAt ? toDayKey(new Date(task.startAt)) : '');
      setStartTime(toTimeValue(task.startAt));
      setEndTime(toTimeValue(task.endAt));
      setEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : '');
      setRecurrenceFreq(task.recurrence?.frequency ?? 'none');
      setRecurrenceInterval(String(task.recurrence?.interval ?? 1));
      setRecurrenceEndDate(task.recurrence?.endDate ?? '');
    } else {
      const initialDate = defaultDate ?? toDayKey(new Date());
      setTitle('');
      setNotes('');
      setStatus('todo');
      setPriority('medium');
      setCategoryId('');
      setTagsText('');
      setDueDate(initialDate);
      setDueTime('');
      setBlockDate(defaultDate ?? '');
      setStartTime('');
      setEndTime('');
      setEstimatedMinutes('');
      setRecurrenceFreq('none');
      setRecurrenceInterval('1');
      setRecurrenceEndDate('');
    }
  }, [open, task, defaultDate]);

  const isPending = mutations.createTask.isPending || mutations.updateTask.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(t('quickAdd.titleRequired'));
      titleRef.current?.focus();
      return;
    }

    const tags = tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const dueAt = dueDate ? fromDayKey(dueDate, dueTime || '23:59').toISOString() : undefined;
    const effectiveBlockDate = blockDate || dueDate;
    const startAt = effectiveBlockDate && startTime ? fromDayKey(effectiveBlockDate, startTime).toISOString() : undefined;
    const endAt =
      effectiveBlockDate && startTime && endTime
        ? fromDayKey(effectiveBlockDate, endTime).toISOString()
        : undefined;
    const mins = estimatedMinutes ? Math.max(0, Number(estimatedMinutes)) : undefined;
    const recurrence: RecurrenceRule | undefined =
      recurrenceFreq === 'none'
        ? undefined
        : {
            frequency: recurrenceFreq,
            interval: Math.max(1, Number(recurrenceInterval) || 1),
            endDate: recurrenceEndDate || undefined,
          };

    try {
      if (task) {
        await mutations.updateTask.mutateAsync({
          id: task.id,
          patch: {
            title: title.trim(),
            notes: notes.trim() || null,
            status,
            priority,
            categoryId: categoryId || null,
            tags,
            dueAt: dueAt ?? null,
            startAt: startAt ?? null,
            endAt: endAt ?? null,
            estimatedMinutes: mins ?? null,
            recurrence: recurrence ?? null,
          },
        });
        toast.success(t('tasks.updated'));
      } else {
        await mutations.createTask.mutateAsync({
          title: title.trim(),
          notes: notes.trim() || undefined,
          status,
          priority,
          categoryId: categoryId || undefined,
          tags,
          dueAt,
          startAt,
          endAt,
          estimatedMinutes: mins,
          recurrence,
        });
        toast.success(t('quickAdd.success'));
      }
      onClose();
    } catch {
      toast.error(t('quickAdd.error'));
    }
  };

  const handleAddCategory = async () => {
    const clean = newCategoryName.trim();
    if (!clean) return;
    const color = CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length]!;
    const created = await mutations.createCategory.mutateAsync({ name: clean, color });
    setCategoryId(created.id);
    setNewCategoryName('');
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;
    await mutations.addSubtask.mutateAsync({ taskId: task.id, title: newSubtaskTitle.trim() });
    setNewSubtaskTitle('');
  };

  const handleDelete = async () => {
    if (!task) return;
    await mutations.deleteTask.mutateAsync(task.id);
    toast.success(t('tasks.deleted'));
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? t('tasks.editTask') : t('tasks.newTask')}
      variant="sheet"
      closeLabel={t('common.close')}
      initialFocusRef={titleRef}
      className="sm:max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {task ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              leadingIcon={<Trash2 />}
              onClick={() => void handleDelete()}
              disabled={mutations.deleteTask.isPending}
            >
              {t('tasks.deleteTask')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form={`${id}-form`} loading={isPending}>
              {isPending ? t('tasks.saving') : task ? t('tasks.save') : t('quickAdd.submit')}
            </Button>
          </div>
        </div>
      }
    >
      <form id={`${id}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label={t('quickAdd.titleLabel')} htmlFor={`${id}-title`} error={titleError ?? undefined}>
          <Input
            ref={titleRef}
            id={`${id}-title`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            placeholder={t('quickAdd.titlePlaceholder')}
            aria-invalid={Boolean(titleError)}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t('tasks.statusLabel')} htmlFor={`${id}-status`}>
            <Select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`taskStatus.${s}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('priority.label')} htmlFor={`${id}-priority`}>
            <Select id={`${id}-priority`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`priority.${p}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('tasks.categoryLabel')} htmlFor={`${id}-cat`}>
            <Select id={`${id}-cat`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">{t('tasks.noCategory')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={t('tasks.newCategoryPlaceholder')}
            className="h-9 text-xs"
            aria-label={t('tasks.newCategoryPlaceholder')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleAddCategory()}
            disabled={!newCategoryName.trim() || mutations.createCategory.isPending}
          >
            {t('tasks.addCategory')}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('tasks.dueLabel')} htmlFor={`${id}-due-date`}>
            <div className="grid grid-cols-2 gap-2">
              <Input id={`${id}-due-date`} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <Input
                type="time"
                aria-label={t('tasks.dueLabel')}
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </Field>

          <Field label={t('quickAdd.durationLabel')} htmlFor={`${id}-est`} optionalLabel={t('common.optional')}>
            <Input
              id={`${id}-est`}
              type="number"
              min={0}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder={fmt.duration(30)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t('quickAdd.dateLabel')} htmlFor={`${id}-block-date`} optionalLabel={t('common.optional')}>
            <Input
              id={`${id}-block-date`}
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
            />
          </Field>
          <Field label={t('tasks.startLabel')} htmlFor={`${id}-start`} optionalLabel={t('common.optional')}>
            <Input id={`${id}-start`} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label={t('tasks.endLabel')} htmlFor={`${id}-end`} optionalLabel={t('common.optional')}>
            <Input id={`${id}-end`} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t('tasks.recurrenceLabel')} htmlFor={`${id}-rec`}>
            <Select
              id={`${id}-rec`}
              value={recurrenceFreq}
              onChange={(e) => setRecurrenceFreq(e.target.value as RecurrenceFrequency | 'none')}
            >
              <option value="none">{t('tasks.recurrenceNone')}</option>
              {RECURRENCE_FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {t(`tasks.recurrence${freq.charAt(0).toUpperCase()}${freq.slice(1)}` as 'tasks.recurrenceDaily')}
                </option>
              ))}
            </Select>
          </Field>

          {recurrenceFreq !== 'none' ? (
            <>
              <Field label={t('tasks.recurrenceInterval')} htmlFor={`${id}-rec-int`}>
                <Input
                  id={`${id}-rec-int`}
                  type="number"
                  min={1}
                  max={99}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value)}
                />
              </Field>
              <Field label={t('tasks.recurrenceEnd')} htmlFor={`${id}-rec-end`} optionalLabel={t('common.optional')}>
                <Input
                  id={`${id}-rec-end`}
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                />
              </Field>
            </>
          ) : null}
        </div>

        <Field label={t('tasks.tagsLabel')} htmlFor={`${id}-tags`} optionalLabel={t('common.optional')}>
          <Input
            id={`${id}-tags`}
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder={t('tasks.tagsPlaceholder')}
          />
        </Field>

        <Field label={t('quickAdd.notesLabel')} htmlFor={`${id}-notes`} optionalLabel={t('common.optional')}>
          <Textarea
            id={`${id}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('quickAdd.notesPlaceholder')}
          />
        </Field>

        {task ? (
          <div className="rounded-2xl border border-line bg-surface-2 p-4">
            <p className="text-xs font-semibold text-ink-muted">{t('tasks.subtasksLabel')}</p>
            <ul className="mt-2.5 flex flex-col gap-2">
              {(task.subtasks ?? []).map((sub) => (
                <li key={sub.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void mutations.toggleSubtask.mutateAsync({ subtaskId: sub.id, completed: !sub.completed })
                    }
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-start text-sm"
                  >
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                        sub.completed
                          ? 'border-primary bg-primary text-primary-fg'
                          : 'border-line-strong bg-surface text-transparent',
                      )}
                    >
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                    <span className={cn('truncate', sub.completed && 'line-through text-ink-subtle')}>
                      {sub.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={t('tasks.deleteTask')}
                    onClick={() => void mutations.deleteSubtask.mutateAsync(sub.id)}
                    className="rounded-md p-1 text-ink-subtle hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddSubtask();
                  }
                }}
                placeholder={t('tasks.addSubtaskPlaceholder')}
                className="h-9 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leadingIcon={<Plus />}
                onClick={() => void handleAddSubtask()}
                disabled={!newSubtaskTitle.trim() || mutations.addSubtask.isPending}
              >
                {t('tasks.addSubtask')}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
