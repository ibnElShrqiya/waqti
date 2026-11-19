import { computeTaskStats, selectUpcomingTasks } from '@/domain/tasks';
import { buildTimeline, findNowIndex } from '@/domain/timeline';
import { useDashboardSnapshot } from '@/features/dashboard/api/useDashboardSnapshot';
import { ActiveGoalsCard } from '@/features/dashboard/components/ActiveGoalsCard';
import { DailyProgressCard } from '@/features/dashboard/components/DailyProgressCard';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { DashboardSkeleton } from '@/features/dashboard/components/DashboardSkeleton';
import { FocusStatsCard } from '@/features/dashboard/components/FocusStatsCard';
import { HabitsCard } from '@/features/dashboard/components/HabitsCard';
import { NotificationsCard } from '@/features/dashboard/components/NotificationsCard';
import { QuickActionsCard } from '@/features/dashboard/components/QuickActionsCard';
import { RafiqInsightsCard } from '@/features/dashboard/components/RafiqInsightsCard';
import { SpiritualSummaryCard } from '@/features/dashboard/components/SpiritualSummaryCard';
import { StatCards } from '@/features/dashboard/components/StatCards';
import { TodayTimeline } from '@/features/dashboard/components/TodayTimeline';
import { UpcomingTasksCard } from '@/features/dashboard/components/UpcomingTasksCard';
import { useNow } from '@/hooks/useNow';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/stores/preferences';
import { Button, ErrorState } from '@/components/ui';

export function DashboardPage() {
  const { t } = useI18n();
  const now = useNow();
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const { data, isPending, isError, refetch } = useDashboardSnapshot();

  if (isPending && !data) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <ErrorState
        title={t('dashboard.error.title')}
        description={t('dashboard.error.hint')}
        action={<Button onClick={() => refetch()}>{t('common.retry')}</Button>}
      />
    );
  }

  const stats = computeTaskStats(data.tasks, now);
  const timeline = buildTimeline(data.tasks, data.schedule, now, { includeSpiritual: spiritualEnabled });
  const nowIndex = findNowIndex(timeline, now);
  const nextItem = timeline.slice(nowIndex).find((item) => !item.done);
  const upcoming = selectUpcomingTasks(data.tasks, now);
  const visibleHabits = data.habits.filter((h) => spiritualEnabled || !h.spiritual);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <DashboardHeader firstName={data.profile.firstName} now={now} source={data.source} />

      <DailyProgressCard stats={stats} habits={visibleHabits} focus={data.focus} nextItem={nextItem} />

      <StatCards stats={stats} focus={data.focus} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <TodayTimeline items={timeline} now={now} />
          <UpcomingTasksCard tasks={upcoming} now={now} />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-5">
          <QuickActionsCard />
          <HabitsCard habits={visibleHabits} now={now} />
          <ActiveGoalsCard goals={data.goals} now={now} />
          <FocusStatsCard focus={data.focus} />
          {spiritualEnabled && data.spiritualSummary ? (
            <SpiritualSummaryCard summary={data.spiritualSummary} />
          ) : null}
          <NotificationsCard notifications={data.notifications} />
          <RafiqInsightsCard insights={data.insights} isDemo={data.source === 'mock'} />
        </div>
      </div>
    </div>
  );
}
