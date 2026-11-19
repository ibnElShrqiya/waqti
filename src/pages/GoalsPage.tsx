import { useMemo, useState } from 'react';
import { Check, Flag, Pencil, Plus } from 'lucide-react';
import { computeGoalProgress, isGoalOverdue } from '@/domain/goals';
import { GOAL_CATEGORIES, type Goal, type GoalCategory } from '@/domain/types';
import { useGoalMutations, useGoalsList } from '@/features/goals/api/useGoals';
import { GoalFormDialog } from '@/features/goals/components/GoalFormDialog';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { fromDayKey, toDayKey } from '@/lib/date';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  SegmentedControl,
  Select,
  Skeleton,
} from '@/components/ui';

type GoalTab = 'active' | 'completed' | 'all';

export function GoalsPage() {
  const { t, tp, fmt } = useI18n();
  const goalsQuery = useGoalsList();
  const mutations = useGoalMutations();

  const [tab, setTab] = useState<GoalTab>('active');
  const [categoryFilter, setCategoryFilter] = useState<GoalCategory | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const todayKey = toDayKey(new Date());
  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);

  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      if (tab === 'active' && g.status !== 'active' && g.status !== 'paused') return false;
      if (tab === 'completed' && g.status !== 'completed') return false;
      if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
      return true;
    });
  }, [goals, tab, categoryFilter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('goalsModule.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('goalsModule.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl<GoalTab>
            label={t('goalsModule.title')}
            value={tab}
            onChange={setTab}
            size="sm"
            options={[
              { value: 'active', label: t('goalsModule.activeTab') },
              { value: 'completed', label: t('goalsModule.completedTab') },
              { value: 'all', label: t('goalsModule.allTab') },
            ]}
          />
          <Select
            aria-label={t('goalsModule.categoryLabel')}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as GoalCategory | 'all')}
            className="h-9 text-xs"
          >
            <option value="all">{t('tasks.allCategories')}</option>
            {GOAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`goalsModule.categories.${c}`)}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => {
              setEditingGoal(null);
              setDialogOpen(true);
            }}
            leadingIcon={<Plus />}
          >
            {t('goalsModule.newGoal')}
          </Button>
        </div>
      </div>

      {goalsQuery.isPending ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-3 h-2 w-full" />
            </Card>
          ))}
        </div>
      ) : goalsQuery.isError ? (
        <ErrorState
          title={t('dashboard.error.title')}
          description={t('dashboard.error.hint')}
          action={<Button onClick={() => void goalsQuery.refetch()}>{t('common.retry')}</Button>}
        />
      ) : filteredGoals.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<Flag />}
            title={t('goalsModule.emptyTitle')}
            description={t('goalsModule.emptyHint')}
            action={
              <Button
                onClick={() => {
                  setEditingGoal(null);
                  setDialogOpen(true);
                }}
                leadingIcon={<Plus />}
              >
                {t('goalsModule.newGoal')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredGoals.map((goal) => {
            const progress = computeGoalProgress(goal);
            const overdue = isGoalOverdue(goal, todayKey);
            const daysLeft = goal.targetDate
              ? Math.round(
                  (fromDayKey(goal.targetDate).getTime() - fromDayKey(todayKey).getTime()) / 86_400_000,
                )
              : null;

            return (
              <Card key={goal.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: goal.color }}
                        aria-hidden
                      />
                      <h2 className="truncate text-base font-semibold text-ink">{goal.title}</h2>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{t(`goalsModule.categories.${goal.category}`)}</Badge>
                      <Badge tone={goal.status === 'completed' ? 'success' : 'primary'}>
                        {t(`goalsModule.statuses.${goal.status}`)}
                      </Badge>
                      {overdue ? <Badge tone="danger">{t('goalsModule.overdue')}</Badge> : null}
                      {!overdue && daysLeft !== null && goal.status !== 'completed' ? (
                        <span className="tabular text-xs text-ink-subtle">
                          {tp('goalsModule.daysLeft', Math.max(0, daysLeft))}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('goalsModule.editGoal')}
                    onClick={() => {
                      setEditingGoal(goal);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                </div>

                {goal.description ? (
                  <p className="text-xs leading-relaxed text-ink-muted">{goal.description}</p>
                ) : null}

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-ink-muted">
                      {goal.milestones.length > 0
                        ? `${fmt.number(goal.milestones.filter((m) => m.isCompleted).length)}/${fmt.number(goal.milestones.length)} ${t('goalsModule.milestonesTitle')}`
                        : goal.targetValue
                          ? `${fmt.number(goal.currentValue)} / ${fmt.number(goal.targetValue)}`
                          : t('goalsModule.manualProgressLabel')}
                    </span>
                    <span className="tabular font-semibold text-primary dark:text-primary-strong">
                      {fmt.percent(progress)}
                    </span>
                  </div>
                  <ProgressBar
                    value={progress}
                    tone={goal.status === 'completed' ? 'success' : 'primary'}
                    label={goal.title}
                  />
                </div>

                {goal.milestones.length > 0 ? (
                  <ul className="flex flex-col gap-1.5 border-t border-line/70 pt-3">
                    {goal.milestones.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() =>
                            void mutations.updateMilestone.mutateAsync({
                              id: m.id,
                              patch: { isCompleted: !m.isCompleted },
                            })
                          }
                          className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-start text-xs transition-colors hover:bg-surface-2"
                        >
                          <span
                            className={cn(
                              'grid size-4 shrink-0 place-items-center rounded border transition-colors',
                              m.isCompleted
                                ? 'border-primary bg-primary text-primary-fg'
                                : 'border-line-strong bg-surface text-transparent',
                            )}
                          >
                            <Check className="size-2.5" strokeWidth={2.5} />
                          </span>
                          <span className={cn('truncate', m.isCompleted && 'line-through text-ink-subtle')}>
                            {m.title}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <GoalFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        goal={editingGoal ? (goals.find((x) => x.id === editingGoal.id) ?? editingGoal) : null}
      />
    </div>
  );
}
