import { CalendarClock, Check, CheckSquare, Clock, MoonStar, Repeat, Timer } from 'lucide-react';
import { findNowIndex, type TimelineItem, type TimelineKind } from '@/domain/timeline';
import { useToggleTask } from '@/features/dashboard/api/mutations';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState } from '@/components/ui';

const KIND_ICON: Record<TimelineKind, typeof CheckSquare> = {
  task: CheckSquare,
  event: CalendarClock,
  focus: Timer,
  prayer: MoonStar,
  habit: Repeat,
};

const KIND_BADGE: Record<TimelineKind, 'neutral' | 'primary' | 'accent' | 'info'> = {
  task: 'neutral',
  event: 'info',
  focus: 'primary',
  prayer: 'accent',
  habit: 'primary',
};

export interface TodayTimelineProps {
  items: TimelineItem[];
  now: Date;
}

export function TodayTimeline({ items, now }: TodayTimelineProps) {
  const { t, fmt } = useI18n();
  const toggleTask = useToggleTask();
  const nowIndex = findNowIndex(items, now);

  return (
    <Card>
      <CardHeader
        title={t('dashboard.timeline.title')}
        description={t('dashboard.timeline.subtitle')}
        icon={<Clock />}
        action={
          <ButtonLink to="/calendar" variant="ghost" size="sm">
            {t('common.viewAll')}
          </ButtonLink>
        }
      />

      <CardBody className="pt-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<CalendarClock />}
            title={t('dashboard.timeline.empty')}
            description={t('dashboard.timeline.emptyHint')}
            compact
          />
        ) : (
          <ol className="relative flex flex-col">
            {items.map((item, idx) => {
              const Icon = KIND_ICON[item.kind];
              const isPast = idx < nowIndex;
              const showNowBefore = idx === nowIndex;
              const isInteractive = Boolean(item.taskId);

              return (
                <li key={item.id} className="relative">
                  {showNowBefore ? <NowDivider label={t('common.now')} time={fmt.time(now)} /> : null}
                  <div
                    className={cn(
                      'group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-2',
                      isPast && item.done && 'opacity-70',
                    )}
                  >
                    <span className="tabular w-16 shrink-0 pt-0.5 text-xs font-medium text-ink-muted">
                      {fmt.time(item.start)}
                    </span>

                    <div className="relative flex flex-col items-center pt-0.5">
                      {isInteractive ? (
                        <button
                          type="button"
                          onClick={() =>
                            toggleTask.mutate({ id: item.taskId!, completed: !item.done })
                          }
                          aria-label={t(
                            item.done ? 'dashboard.timeline.markUndone' : 'dashboard.timeline.markDone',
                            { title: item.title },
                          )}
                          aria-pressed={item.done}
                          className={cn(
                            'grid size-6 place-items-center rounded-lg border transition-colors',
                            item.done
                              ? 'border-primary bg-primary text-primary-fg'
                              : 'border-line-strong bg-surface text-transparent hover:border-primary',
                          )}
                        >
                          <Check className="size-3.5" strokeWidth={2.5} />
                        </button>
                      ) : (
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-6 place-items-center rounded-lg border',
                            item.kind === 'prayer'
                              ? 'border-accent/40 bg-accent-soft text-accent-strong'
                              : 'border-line bg-surface-2 text-ink-muted',
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            'truncate text-sm font-medium text-ink',
                            item.done && item.kind === 'task' && 'line-through text-ink-subtle',
                          )}
                        >
                          {item.title}
                        </p>
                        <Badge tone={KIND_BADGE[item.kind]}>
                          {t(`dashboard.timeline.types.${item.kind}`)}
                        </Badge>
                      </div>
                      {item.end ? (
                        <p className="tabular mt-0.5 text-xs text-ink-subtle">
                          {fmt.time(item.start)} – {fmt.time(item.end)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
            {nowIndex === items.length ? <NowDivider label={t('common.now')} time={fmt.time(now)} /> : null}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}

function NowDivider({ label, time }: { label: string; time: string }) {
  return (
    <div className="my-1.5 flex items-center gap-2 px-2" aria-hidden>
      <span className="size-2 rounded-full bg-accent ring-4 ring-accent-soft" />
      <span className="h-px flex-1 bg-accent/60" />
      <span className="tabular text-2xs font-semibold uppercase tracking-wider text-accent-strong rtl:tracking-normal">
        {label} · {time}
      </span>
    </div>
  );
}
