import { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Leaf,
  Minus,
  Moon,
  Pencil,
  PenLine,
  Plus,
  Repeat,
  Sun,
} from 'lucide-react';
import {
  computeHabitCompletionRate,
  computeHabitStreaks,
  isHabitCompletedOn,
  isHabitScheduledOn,
} from '@/domain/habits';
import type { Habit, HabitIcon } from '@/domain/types';
import { useHabitLogs, useHabitMutations, useHabitsList } from '@/features/habits/api/useHabits';
import { HabitAnalytics } from '@/features/habits/components/HabitAnalytics';
import { HabitFormDialog } from '@/features/habits/components/HabitFormDialog';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { toDayKey } from '@/lib/date';
import { usePreferences } from '@/stores/preferences';
import { toast } from '@/stores/toast';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ProgressBar,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';

const HABIT_ICONS: Record<HabitIcon, typeof Repeat> = {
  run: Footprints,
  book: BookOpen,
  water: Droplets,
  moon: Moon,
  sun: Sun,
  leaf: Leaf,
  pen: PenLine,
  heart: Heart,
};

type HabitTab = 'active' | 'archived';

export function HabitsPage() {
  const { t, tp, fmt } = useI18n();
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const habitsQuery = useHabitsList();
  const logsQuery = useHabitLogs();
  const mutations = useHabitMutations();

  const [tab, setTab] = useState<HabitTab>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const todayKey = toDayKey(new Date());
  const allHabits = useMemo(
    () => (habitsQuery.data ?? []).filter((h) => spiritualEnabled || !h.spiritual),
    [habitsQuery.data, spiritualEnabled],
  );
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const activeHabits = useMemo(() => allHabits.filter((h) => !h.isArchived), [allHabits]);
  const visibleHabits = useMemo(
    () => allHabits.filter((h) => (tab === 'active' ? !h.isArchived : h.isArchived)),
    [allHabits, tab],
  );

  const todayScheduled = useMemo(
    () => activeHabits.filter((h) => isHabitScheduledOn(h, todayKey)),
    [activeHabits, todayKey],
  );

  const todayCompletedCount = useMemo(
    () =>
      todayScheduled.filter((h) => {
        const byDate = new Map(logs.filter((l) => l.habitId === h.id).map((l) => [l.logDate, l]));
        return isHabitCompletedOn(h, byDate, todayKey);
      }).length,
    [todayScheduled, logs, todayKey],
  );

  const analytics = useMemo(() => {
    let bestCurrent = 0;
    let bestLongest = 0;
    let rateSum = 0;
    for (const h of activeHabits) {
      const s = computeHabitStreaks(h, logs, todayKey);
      if (s.current > bestCurrent) bestCurrent = s.current;
      if (s.longest > bestLongest) bestLongest = s.longest;
      rateSum += computeHabitCompletionRate(h, logs, 30, todayKey);
    }
    const monthlyRate = activeHabits.length === 0 ? 0 : rateSum / activeHabits.length;
    const habitTargetMap = new Map(allHabits.map((h) => [h.id, h.targetCount]));
    const totalCompleted = logs.filter((l) => l.completedCount >= (habitTargetMap.get(l.habitId) ?? 1)).length;
    return { bestCurrent, bestLongest, monthlyRate, totalCompleted };
  }, [activeHabits, allHabits, logs, todayKey]);

  const progressRatio = todayScheduled.length === 0 ? 0 : todayCompletedCount / todayScheduled.length;
  const remaining = Math.max(0, todayScheduled.length - todayCompletedCount);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('habitsModule.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('habitsModule.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl<HabitTab>
            label={t('habitsModule.title')}
            value={tab}
            onChange={setTab}
            size="sm"
            options={[
              { value: 'active', label: t('habitsModule.activeTab') },
              { value: 'archived', label: t('habitsModule.archivedTab') },
            ]}
          />
          <Button
            onClick={() => {
              setEditingHabit(null);
              setDialogOpen(true);
            }}
            leadingIcon={<Plus />}
          >
            {t('habitsModule.newHabit')}
          </Button>
        </div>
      </div>

      {/* Encouraging daily progress banner */}
      <Card className="bg-hero p-5 text-hero-fg sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent rtl:tracking-normal">
              {t('habitsModule.todayProgress')}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-hero-fg">
              {t('habitsModule.completedCount', {
                done: fmt.number(todayCompletedCount),
                total: fmt.number(todayScheduled.length),
              })}
            </h2>
            <p className="mt-1 text-xs text-hero-muted">
              {remaining === 0 && todayScheduled.length > 0
                ? t('habitsModule.encouragementDone')
                : t('habitsModule.encouragementProgress')}
            </p>
          </div>
          <div className="sm:w-56">
            <div className="mb-1.5 flex justify-between text-xs text-hero-muted">
              <span>{tp('habitsModule.remainingCount', remaining)}</span>
              <span className="tabular font-semibold text-hero-fg">{fmt.percent(progressRatio)}</span>
            </div>
            <ProgressBar value={progressRatio} tone="accent" label={t('habitsModule.todayProgress')} />
          </div>
        </div>
      </Card>

      {habitsQuery.isPending || logsQuery.isPending ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </Card>
            ))}
          </div>
        </div>
      ) : habitsQuery.isError || logsQuery.isError ? (
        <ErrorState
          title={t('dashboard.error.title')}
          description={t('dashboard.error.hint')}
          action={<Button onClick={() => void habitsQuery.refetch()}>{t('common.retry')}</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
            {visibleHabits.length === 0 ? (
              <Card className="p-6">
                <EmptyState
                  icon={<Repeat />}
                  title={t('habitsModule.emptyTitle')}
                  description={t('habitsModule.emptyHint')}
                  action={
                    <Button
                      onClick={() => {
                        setEditingHabit(null);
                        setDialogOpen(true);
                      }}
                      leadingIcon={<Plus />}
                    >
                      {t('habitsModule.newHabit')}
                    </Button>
                  }
                />
              </Card>
            ) : (
              visibleHabits.map((habit) => {
                const Icon = HABIT_ICONS[habit.icon] ?? Repeat;
                const todayLog = logs.find((l) => l.habitId === habit.id && l.logDate === todayKey);
                const count = todayLog?.completedCount ?? 0;
                const isDone = count >= habit.targetCount;
                const streaks = computeHabitStreaks(habit, logs, todayKey);
                const noteVal = noteDrafts[habit.id] ?? todayLog?.notes ?? '';

                return (
                  <Card key={habit.id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            void mutations.logProgress.mutateAsync({
                              habitId: habit.id,
                              logDate: todayKey,
                              completedCount: isDone ? 0 : habit.targetCount,
                              notes: todayLog?.notes,
                            })
                          }
                          aria-label={t(isDone ? 'dashboard.habits.markUndone' : 'dashboard.habits.markDone', {
                            name: habit.name,
                          })}
                          aria-pressed={isDone}
                          className={cn(
                            'mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl border transition-all active:scale-95',
                            isDone
                              ? 'border-primary bg-primary text-primary-fg shadow-xs'
                              : 'border-line-strong bg-surface-2 text-ink-muted hover:border-primary',
                          )}
                        >
                          {isDone ? <Check className="size-5" strokeWidth={2.5} /> : <Icon className="size-5" />}
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-ink">{habit.name}</h3>
                            <Badge tone={streaks.current >= 7 ? 'accent' : 'neutral'}>
                              <Flame aria-hidden />
                              <span>{tp('dashboard.habits.streak', streaks.current)}</span>
                            </Badge>
                          </div>
                          {habit.description ? (
                            <p className="mt-0.5 text-xs text-ink-muted">{habit.description}</p>
                          ) : null}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('habitsModule.editHabit')}
                        onClick={() => {
                          setEditingHabit(habit);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                    </div>

                    {habit.targetCount > 1 ? (
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar value={count / habit.targetCount} size="sm" label={habit.name} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="-1"
                            onClick={() =>
                              void mutations.logProgress.mutateAsync({
                                habitId: habit.id,
                                logDate: todayKey,
                                completedCount: Math.max(0, count - 1),
                                notes: todayLog?.notes,
                              })
                            }
                          >
                            <Minus />
                          </Button>
                          <span className="tabular min-w-[44px] text-center text-xs font-semibold text-ink">
                            {fmt.number(count)}/{fmt.number(habit.targetCount)}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            aria-label="+1"
                            onClick={() =>
                              void mutations.logProgress.mutateAsync({
                                habitId: habit.id,
                                logDate: todayKey,
                                completedCount: count + 1,
                                notes: todayLog?.notes,
                              })
                            }
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={noteVal}
                        onChange={(e) => setNoteDrafts((d) => ({ ...d, [habit.id]: e.target.value }))}
                        placeholder={t('habitsModule.notesPlaceholder')}
                        className="h-8 text-xs"
                        aria-label={t('habitsModule.notesPlaceholder')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void mutations.logProgress
                            .mutateAsync({
                              habitId: habit.id,
                              logDate: todayKey,
                              completedCount: count,
                              notes: noteVal,
                            })
                            .then(() => toast.success(t('habitsModule.updated')));
                        }}
                      >
                        {t('habitsModule.saveNote')}
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          <div className="lg:col-span-5">
            <HabitAnalytics
              habits={activeHabits}
              logs={logs}
              todayKey={todayKey}
              bestCurrentStreak={analytics.bestCurrent}
              bestLongestStreak={analytics.bestLongest}
              monthlyRate={analytics.monthlyRate}
              totalCompleted={analytics.totalCompleted}
            />
          </div>
        </div>
      )}

      <HabitFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} habit={editingHabit} />
    </div>
  );
}
