import { BookOpen, Check, Droplets, Flame, Footprints, Heart, Leaf, Moon, PenLine, Repeat, Sun } from 'lucide-react';
import type { HabitIcon, HabitSummary } from '@/domain/types';
import { useToggleHabit } from '@/features/dashboard/api/mutations';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { addDays } from '@/lib/date';
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState } from '@/components/ui';

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

export interface HabitsCardProps {
  habits: HabitSummary[];
  now: Date;
}

export function HabitsCard({ habits, now }: HabitsCardProps) {
  const { t, tp, fmt } = useI18n();
  const toggleHabit = useToggleHabit();
  const doneCount = habits.filter((h) => h.completedToday).length;

  return (
    <Card>
      <CardHeader
        title={t('dashboard.habits.title')}
        description={
          habits.length > 0
            ? t('dashboard.habits.summary', { done: fmt.number(doneCount), total: fmt.number(habits.length) })
            : undefined
        }
        icon={<Repeat />}
        action={
          <ButtonLink to="/habits" variant="ghost" size="sm">
            {t('common.viewAll')}
          </ButtonLink>
        }
      />

      <CardBody className="pt-4">
        {habits.length === 0 ? (
          <EmptyState
            icon={<Repeat />}
            title={t('dashboard.habits.empty')}
            description={t('dashboard.habits.emptyHint')}
            compact
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {habits.map((habit) => {
              const Icon = HABIT_ICONS[habit.icon] ?? Repeat;
              return (
                <li
                  key={habit.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-line-strong"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleHabit.mutate({ id: habit.id, done: !habit.completedToday })}
                      aria-label={t(
                        habit.completedToday ? 'dashboard.habits.markUndone' : 'dashboard.habits.markDone',
                        { name: habit.name },
                      )}
                      aria-pressed={habit.completedToday}
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-xl border transition-all active:scale-95',
                        habit.completedToday
                          ? 'border-primary bg-primary text-primary-fg shadow-xs'
                          : 'border-line-strong bg-surface text-ink-muted hover:border-primary hover:text-primary',
                      )}
                    >
                      {habit.completedToday ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" />}
                    </button>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{habit.name}</p>
                      <div className="mt-1 flex items-center gap-1" aria-label={t('dashboard.habits.lastSevenDays')}>
                        {habit.lastSevenDays.map((done, i) => {
                          const day = addDays(now, i - (habit.lastSevenDays.length - 1));
                          return (
                            <span
                              key={i}
                              title={fmt.weekdayShort(day)}
                              className={cn(
                                'size-2 rounded-full transition-colors',
                                done ? 'bg-primary dark:bg-primary' : 'bg-line-strong/60',
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <Badge tone={habit.streak >= 7 ? 'accent' : 'neutral'} className="shrink-0">
                    <Flame className="size-3" aria-hidden />
                    <span>{tp('dashboard.habits.streak', habit.streak)}</span>
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
