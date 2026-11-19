import { Check, CheckSquare } from 'lucide-react';
import { isOverdue, taskAnchorDate } from '@/domain/tasks';
import type { Priority, Task } from '@/domain/types';
import { useToggleTask } from '@/features/dashboard/api/mutations';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState, type BadgeTone } from '@/components/ui';

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

export interface UpcomingTasksCardProps {
  tasks: Task[];
  now: Date;
}

export function UpcomingTasksCard({ tasks, now }: UpcomingTasksCardProps) {
  const { t, fmt } = useI18n();
  const toggleTask = useToggleTask();

  return (
    <Card>
      <CardHeader
        title={t('dashboard.upcoming.title')}
        icon={<CheckSquare />}
        action={
          <ButtonLink to="/tasks" variant="ghost" size="sm">
            {t('common.viewAll')}
          </ButtonLink>
        }
      />

      <CardBody className="pt-4">
        {tasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare />}
            title={t('dashboard.upcoming.empty')}
            description={t('dashboard.upcoming.emptyHint')}
            compact
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => {
              const anchor = taskAnchorDate(task);
              const overdue = isOverdue(task, now);
              const done = task.status === 'completed';

              return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-line-strong"
                >
                  <button
                    type="button"
                    onClick={() => toggleTask.mutate({ id: task.id, completed: !done })}
                    aria-label={t(done ? 'dashboard.timeline.markUndone' : 'dashboard.timeline.markDone', {
                      title: task.title,
                    })}
                    aria-pressed={done}
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                      done
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-line-strong bg-surface text-transparent hover:border-primary',
                    )}
                  >
                    <Check className="size-3" strokeWidth={2.5} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm font-medium text-ink', done && 'line-through text-ink-subtle')}>
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={PRIORITY_TONE[task.priority]}>{t(`priority.${task.priority}`)}</Badge>
                      {anchor ? (
                        <span className={cn('tabular text-xs', overdue ? 'font-medium text-danger' : 'text-ink-subtle')}>
                          {overdue ? `${t('dashboard.upcoming.overdue')} · ` : ''}
                          {fmt.relativeDay(anchor, now)} · {fmt.time(anchor)}
                        </span>
                      ) : null}
                      {task.estimatedMinutes ? (
                        <span className="tabular text-xs text-ink-subtle">· {fmt.duration(task.estimatedMinutes)}</span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
