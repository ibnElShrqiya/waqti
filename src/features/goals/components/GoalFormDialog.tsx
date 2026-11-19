import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import {
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  PRIORITIES,
  type Goal,
  type GoalCategory,
  type GoalStatus,
  type Priority,
} from '@/domain/types';
import { useGoalMutations } from '@/features/goals/api/useGoals';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { toDayKey } from '@/lib/date';
import { toast } from '@/stores/toast';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui';

const GOAL_COLORS = ['#176B56', '#2D699B', '#D1AD70', '#B93C34', '#6D4C9B'];

export interface GoalFormDialogProps {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
}

export function GoalFormDialog({ open, onClose, goal }: GoalFormDialogProps) {
  const { t } = useI18n();
  const mutations = useGoalMutations();
  const titleRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('personal');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [color, setColor] = useState(GOAL_COLORS[0]!);
  const [startDate, setStartDate] = useState(() => toDayKey(new Date()));
  const [targetDate, setTargetDate] = useState('');
  const [manualProgress, setManualProgress] = useState('0');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitleError(null);
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description ?? '');
      setCategory(goal.category);
      setPriority(goal.priority);
      setStatus(goal.status);
      setColor(goal.color);
      setStartDate(goal.startDate);
      setTargetDate(goal.targetDate ?? '');
      setManualProgress(String(goal.manualProgress));
      setTargetValue(goal.targetValue ? String(goal.targetValue) : '');
      setCurrentValue(String(goal.currentValue));
    } else {
      setTitle('');
      setDescription('');
      setCategory('personal');
      setPriority('medium');
      setStatus('active');
      setColor(GOAL_COLORS[0]!);
      setStartDate(toDayKey(new Date()));
      setTargetDate('');
      setManualProgress('0');
      setTargetValue('');
      setCurrentValue('0');
    }
  }, [open, goal]);

  const hasMilestones = Boolean(goal && goal.milestones.length > 0);
  const isPending = mutations.createGoal.isPending || mutations.updateGoal.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError(t('quickAdd.titleRequired'));
      titleRef.current?.focus();
      return;
    }

    const parsedTarget = targetValue ? Number(targetValue) : undefined;
    const parsedCurrent = Number(currentValue) || 0;
    const parsedManual = Math.min(100, Math.max(0, Number(manualProgress) || 0));

    try {
      if (goal) {
        await mutations.updateGoal.mutateAsync({
          id: goal.id,
          patch: {
            title: title.trim(),
            description: description.trim() || null,
            category,
            priority,
            status,
            color,
            startDate,
            targetDate: targetDate || null,
            manualProgress: parsedManual,
            targetValue: parsedTarget ?? null,
            currentValue: parsedCurrent,
          },
        });
        toast.success(t('goalsModule.updated'));
      } else {
        await mutations.createGoal.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          priority,
          status,
          color,
          startDate,
          targetDate: targetDate || undefined,
          manualProgress: parsedManual,
          targetValue: parsedTarget,
          currentValue: parsedCurrent,
        });
        toast.success(t('goalsModule.created'));
      }
      onClose();
    } catch {
      toast.error(t('quickAdd.error'));
    }
  };

  const handleAddMilestone = async () => {
    if (!goal || !newMilestoneTitle.trim()) return;
    await mutations.addMilestone.mutateAsync({
      goalId: goal.id,
      title: newMilestoneTitle.trim(),
      targetDate: newMilestoneDate || undefined,
    });
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
  };

  const moveMilestone = (index: number, delta: -1 | 1) => {
    if (!goal) return;
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= goal.milestones.length) return;
    const copy = [...goal.milestones];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved!);
    void mutations.reorderMilestones.mutateAsync({
      goalId: goal.id,
      orderedIds: copy.map((m) => m.id),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={goal ? t('goalsModule.editGoal') : t('goalsModule.newGoal')}
      variant="sheet"
      closeLabel={t('common.close')}
      initialFocusRef={titleRef}
      className="sm:max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {goal ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger hover:bg-danger-soft hover:text-danger"
              leadingIcon={<Trash2 />}
              onClick={() => {
                void mutations.deleteGoal.mutateAsync(goal.id).then(() => {
                  toast.success(t('goalsModule.deleted'));
                  onClose();
                });
              }}
            >
              {t('goalsModule.deleteGoal')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isPending}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form={`${id}-form`} loading={isPending}>
              {t('tasks.save')}
            </Button>
          </div>
        </div>
      }
    >
      <form id={`${id}-form`} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label={t('goalsModule.titleLabel')} htmlFor={`${id}-title`} error={titleError ?? undefined}>
          <Input
            ref={titleRef}
            id={`${id}-title`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError(null);
            }}
            placeholder={t('goalsModule.titlePlaceholder')}
            aria-invalid={Boolean(titleError)}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t('goalsModule.categoryLabel')} htmlFor={`${id}-cat`}>
            <Select id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value as GoalCategory)}>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`goalsModule.categories.${c}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('priority.label')} htmlFor={`${id}-prio`}>
            <Select id={`${id}-prio`} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`priority.${p}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('goalsModule.statusLabel')} htmlFor={`${id}-status`}>
            <Select id={`${id}-status`} value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`goalsModule.statuses.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('goalsModule.startDateLabel')} htmlFor={`${id}-start`}>
            <Input id={`${id}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label={t('goalsModule.targetDateLabel')} htmlFor={`${id}-target`} optionalLabel={t('common.optional')}>
            <Input id={`${id}-target`} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </div>

        {hasMilestones ? (
          <p className="rounded-xl bg-primary-soft px-3.5 py-2 text-xs text-primary dark:text-primary-strong">
            {t('goalsModule.milestoneAutoNote')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={t('goalsModule.manualProgressLabel')} htmlFor={`${id}-manual`}>
              <Input
                id={`${id}-manual`}
                type="number"
                min={0}
                max={100}
                value={manualProgress}
                onChange={(e) => setManualProgress(e.target.value)}
              />
            </Field>
            <Field label={t('goalsModule.targetValueLabel')} htmlFor={`${id}-tval`} optionalLabel={t('common.optional')}>
              <Input
                id={`${id}-tval`}
                type="number"
                min={0}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </Field>
            <Field label={t('goalsModule.currentValueLabel')} htmlFor={`${id}-cval`}>
              <Input
                id={`${id}-cval`}
                type="number"
                min={0}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
              />
            </Field>
          </div>
        )}

        <div>
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">{t('goalsModule.colorLabel')}</span>
          <div className="flex items-center gap-2">
            {GOAL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={cn(
                  'size-7 rounded-full border-2 transition-transform',
                  color === c ? 'scale-110 border-ink' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <Field label={t('goalsModule.descriptionLabel')} htmlFor={`${id}-desc`} optionalLabel={t('common.optional')}>
          <Textarea id={`${id}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {goal ? (
          <div className="rounded-2xl border border-line bg-surface-2 p-4">
            <p className="text-xs font-semibold text-ink-muted">{t('goalsModule.milestonesTitle')}</p>
            <ul className="mt-2.5 flex flex-col gap-2">
              {goal.milestones.map((m, idx) => (
                <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-line/70 bg-surface px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      void mutations.updateMilestone.mutateAsync({
                        id: m.id,
                        patch: { isCompleted: !m.isCompleted },
                      })
                    }
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-start text-sm"
                  >
                    <span
                      className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                        m.isCompleted
                          ? 'border-primary bg-primary text-primary-fg'
                          : 'border-line-strong bg-surface text-transparent',
                      )}
                    >
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                    <span className={cn('truncate', m.isCompleted && 'line-through text-ink-subtle')}>
                      {m.title}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={t('goalsModule.moveUp')}
                      disabled={idx === 0}
                      onClick={() => moveMilestone(idx, -1)}
                      className="rounded-md p-1 text-ink-subtle hover:text-ink disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('goalsModule.moveDown')}
                      disabled={idx === goal.milestones.length - 1}
                      onClick={() => moveMilestone(idx, 1)}
                      className="rounded-md p-1 text-ink-subtle hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('goalsModule.deleteGoal')}
                      onClick={() => void mutations.deleteMilestone.mutateAsync(m.id)}
                      className="rounded-md p-1 text-ink-subtle hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleAddMilestone();
                  }
                }}
                placeholder={t('goalsModule.addMilestonePlaceholder')}
                className="h-9 flex-1 text-xs"
              />
              <Input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                className="h-9 text-xs sm:w-40"
                aria-label={t('goalsModule.targetDateLabel')}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                leadingIcon={<Plus />}
                onClick={() => void handleAddMilestone()}
                disabled={!newMilestoneTitle.trim() || mutations.addMilestone.isPending}
              >
                {t('goalsModule.addMilestone')}
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
