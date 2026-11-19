import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Archive, Trash2 } from 'lucide-react';
import {
  HABIT_FREQUENCY_TYPES,
  type Habit,
  type HabitFrequencyType,
  type HabitIcon,
} from '@/domain/types';
import { useHabitMutations } from '@/features/habits/api/useHabits';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { addDays, toDayKey } from '@/lib/date';
import { toast } from '@/stores/toast';
import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui';

const HABIT_ICONS: HabitIcon[] = ['leaf', 'run', 'book', 'water', 'moon', 'sun', 'pen', 'heart'];
const HABIT_COLORS = ['#176B56', '#2D699B', '#D1AD70', '#B93C34', '#6D4C9B'];

export interface HabitFormDialogProps {
  open: boolean;
  onClose: () => void;
  habit: Habit | null;
}

export function HabitFormDialog({ open, onClose, habit }: HabitFormDialogProps) {
  const { t, fmt } = useI18n();
  const mutations = useHabitMutations();
  const nameRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<HabitIcon>('leaf');
  const [color, setColor] = useState(HABIT_COLORS[0]!);
  const [category, setCategory] = useState('personal');
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [targetDays, setTargetDays] = useState('4');
  const [targetCount, setTargetCount] = useState('1');
  const [reminderTime, setReminderTime] = useState('');
  const [startDate, setStartDate] = useState(() => toDayKey(new Date()));
  const [endDate, setEndDate] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNameError(null);
    if (habit) {
      setName(habit.name);
      setDescription(habit.description ?? '');
      setIcon(habit.icon);
      setColor(habit.color);
      setCategory(habit.category);
      setFrequencyType(habit.frequencyType);
      setWeekdays(habit.frequencyConfig.weekdays ?? [0, 1, 2, 3, 4]);
      setTargetDays(String(habit.frequencyConfig.targetDays ?? 4));
      setTargetCount(String(habit.targetCount));
      setReminderTime(habit.reminderTime ?? '');
      setStartDate(habit.startDate);
      setEndDate(habit.endDate ?? '');
    } else {
      setName('');
      setDescription('');
      setIcon('leaf');
      setColor(HABIT_COLORS[0]!);
      setCategory('personal');
      setFrequencyType('daily');
      setWeekdays([0, 1, 2, 3, 4]);
      setTargetDays('4');
      setTargetCount('1');
      setReminderTime('');
      setStartDate(toDayKey(new Date()));
      setEndDate('');
    }
  }, [open, habit]);

  const sunday = new Date(2026, 10, 15);
  const weekdayButtons = Array.from({ length: 7 }, (_, i) => ({
    day: i,
    label: fmt.weekdayNarrow(addDays(sunday, i)),
  }));

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const isPending = mutations.createHabit.isPending || mutations.updateHabit.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(t('quickAdd.titleRequired'));
      nameRef.current?.focus();
      return;
    }

    const frequencyConfig =
      frequencyType === 'weekdays'
        ? { weekdays }
        : frequencyType === 'weekly_target' || frequencyType === 'monthly_target'
          ? { targetDays: Math.max(1, Number(targetDays) || 1) }
          : {};

    try {
      if (habit) {
        await mutations.updateHabit.mutateAsync({
          id: habit.id,
          patch: {
            name: name.trim(),
            description: description.trim() || null,
            icon,
            color,
            category: category.trim() || 'personal',
            frequencyType,
            frequencyConfig,
            targetCount: Math.max(1, Number(targetCount) || 1),
            reminderTime: reminderTime || null,
            startDate,
            endDate: endDate || null,
          },
        });
        toast.success(t('habitsModule.updated'));
      } else {
        await mutations.createHabit.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          icon,
          color,
          category: category.trim() || 'personal',
          frequencyType,
          frequencyConfig,
          targetCount: Math.max(1, Number(targetCount) || 1),
          reminderTime: reminderTime || undefined,
          startDate,
          endDate: endDate || undefined,
        });
        toast.success(t('habitsModule.created'));
      }
      onClose();
    } catch {
      toast.error(t('quickAdd.error'));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={habit ? t('habitsModule.editHabit') : t('habitsModule.newHabit')}
      variant="sheet"
      closeLabel={t('common.close')}
      initialFocusRef={nameRef}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {habit ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leadingIcon={<Archive />}
                onClick={() => {
                  void mutations.updateHabit
                    .mutateAsync({ id: habit.id, patch: { isArchived: !habit.isArchived } })
                    .then(() => {
                      toast.success(t('habitsModule.updated'));
                      onClose();
                    });
                }}
              >
                {habit.isArchived ? t('habitsModule.unarchiveHabit') : t('habitsModule.archiveHabit')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                leadingIcon={<Trash2 />}
                onClick={() => {
                  void mutations.deleteHabit.mutateAsync(habit.id).then(() => {
                    toast.success(t('habitsModule.deleted'));
                    onClose();
                  });
                }}
              >
                {t('habitsModule.deleteHabit')}
              </Button>
            </div>
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
        <Field label={t('habitsModule.nameLabel')} htmlFor={`${id}-name`} error={nameError ?? undefined}>
          <Input
            ref={nameRef}
            id={`${id}-name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder={t('habitsModule.namePlaceholder')}
            aria-invalid={Boolean(nameError)}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t('habitsModule.categoryLabel')} htmlFor={`${id}-cat`}>
            <Input id={`${id}-cat`} value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label={t('habitsModule.targetCountLabel')} htmlFor={`${id}-count`}>
            <Input
              id={`${id}-count`}
              type="number"
              min={1}
              max={99}
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t('habitsModule.frequencyLabel')} htmlFor={`${id}-freq`}>
          <Select
            id={`${id}-freq`}
            value={frequencyType}
            onChange={(e) => setFrequencyType(e.target.value as HabitFrequencyType)}
          >
            {HABIT_FREQUENCY_TYPES.map((f) => (
              <option key={f} value={f}>
                {f === 'daily'
                  ? t('habitsModule.freqDaily')
                  : f === 'weekdays'
                    ? t('habitsModule.freqWeekdays')
                    : f === 'weekly_target'
                      ? t('habitsModule.freqWeeklyTarget')
                      : t('habitsModule.freqMonthlyTarget')}
              </option>
            ))}
          </Select>
        </Field>

        {frequencyType === 'weekdays' ? (
          <div className="flex flex-wrap gap-1.5">
            {weekdayButtons.map((w) => {
              const active = weekdays.includes(w.day);
              return (
                <button
                  key={w.day}
                  type="button"
                  onClick={() => toggleWeekday(w.day)}
                  aria-pressed={active}
                  className={cn(
                    'grid size-9 place-items-center rounded-xl border text-xs font-semibold transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-line bg-surface-2 text-ink-muted hover:text-ink',
                  )}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {frequencyType === 'weekly_target' || frequencyType === 'monthly_target' ? (
          <Field label={t('habitsModule.targetDaysLabel')} htmlFor={`${id}-tdays`}>
            <Input
              id={`${id}-tdays`}
              type="number"
              min={1}
              max={frequencyType === 'weekly_target' ? 7 : 31}
              value={targetDays}
              onChange={(e) => setTargetDays(e.target.value)}
            />
          </Field>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t('habitsModule.startDateLabel')} htmlFor={`${id}-start`}>
            <Input id={`${id}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label={t('habitsModule.endDateLabel')} htmlFor={`${id}-end`} optionalLabel={t('common.optional')}>
            <Input id={`${id}-end`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
          <Field label={t('habitsModule.reminderLabel')} htmlFor={`${id}-rem`} optionalLabel={t('common.optional')}>
            <Input id={`${id}-rem`} type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">{t('habitsModule.iconLabel')}</span>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    'rounded-lg border px-2 py-1 text-2xs font-medium capitalize',
                    icon === ic ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface-2 text-ink-muted',
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">{t('habitsModule.colorLabel')}</span>
            <div className="flex items-center gap-2 pt-1">
              {HABIT_COLORS.map((c) => (
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
        </div>

        <Field label={t('habitsModule.descriptionLabel')} htmlFor={`${id}-desc`} optionalLabel={t('common.optional')}>
          <Textarea id={`${id}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
