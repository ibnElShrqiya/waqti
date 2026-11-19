import { Flag } from 'lucide-react';
import { computeGoalProgress, isGoalOverdue } from '@/domain/goals';
import type { Goal } from '@/domain/types';
import { useI18n } from '@/i18n';
import { fromDayKey, toDayKey } from '@/lib/date';
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, ProgressBar } from '@/components/ui';

export interface ActiveGoalsCardProps {
  goals: Goal[];
  now: Date;
}

export function ActiveGoalsCard({ goals, now }: ActiveGoalsCardProps) {
  const { t, fmt } = useI18n();
  const todayKey = toDayKey(now);

  return (
    <Card>
      <CardHeader
        title={t('dashboard.goals.title')}
        icon={<Flag />}
        action={
          <ButtonLink to="/goals" variant="ghost" size="sm">
            {t('common.viewAll')}
          </ButtonLink>
        }
      />
      <CardBody className="pt-4">
        {goals.length === 0 ? (
          <EmptyState
            icon={<Flag />}
            title={t('dashboard.goals.empty')}
            description={t('dashboard.goals.emptyHint')}
            compact
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {goals.slice(0, 3).map((goal) => {
              const progress = computeGoalProgress(goal);
              const overdue = isGoalOverdue(goal, todayKey);
              return (
                <li key={goal.id} className="rounded-2xl border border-line/70 bg-surface-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: goal.color }}
                        aria-hidden
                      />
                      <p className="truncate text-sm font-medium text-ink">{goal.title}</p>
                    </div>
                    {overdue ? (
                      <Badge tone="danger">{t('dashboard.goals.overdue')}</Badge>
                    ) : (
                      <span className="tabular text-xs font-semibold text-primary dark:text-primary-strong">
                        {fmt.percent(progress)}
                      </span>
                    )}
                  </div>
                  <ProgressBar value={progress} size="sm" label={goal.title} className="mt-2" />
                  {goal.targetDate ? (
                    <p className="mt-1.5 text-2xs text-ink-subtle">
                      {t('dashboard.goals.dueDate', { date: fmt.shortDate(fromDayKey(goal.targetDate)) })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
