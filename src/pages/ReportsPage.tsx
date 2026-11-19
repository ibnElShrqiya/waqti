import { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import {
  computeDateRange,
  computeProductivityReport,
  exportReportToCsv,
  type ReportPeriod,
} from '@/domain/analytics';
import { canAccessFeature } from '@/domain/entitlements';
import { PRIORITIES } from '@/domain/types';
import { useCalendarEvents } from '@/features/calendar/api/useCalendar';
import { useFocusSessions } from '@/features/focus/api/useFocus';
import { useGoalsList } from '@/features/goals/api/useGoals';
import { useHabitLogs, useHabitsList } from '@/features/habits/api/useHabits';
import { useEntitlements } from '@/features/subscription/api/useSubscription';
import { UpgradePrompt } from '@/features/subscription/components/UpgradePrompt';
import { useTasksList } from '@/features/tasks/api/useTasks';
import { useI18n } from '@/i18n';
import { fromDayKey, toDayKey } from '@/lib/date';
import { toast } from '@/stores/toast';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  ProgressBar,
  SegmentedControl,
} from '@/components/ui';

export function ReportsPage() {
  const { t, fmt } = useI18n();
  const entitlements = useEntitlements();
  const tasksQuery = useTasksList();
  const focusQuery = useFocusSessions();
  const habitsQuery = useHabitsList();
  const logsQuery = useHabitLogs();
  const goalsQuery = useGoalsList();
  const eventsQuery = useCalendarEvents();

  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [customStart, setCustomStart] = useState(() => toDayKey(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toDayKey(new Date()));

  const canAdvanced = canAccessFeature(entitlements, 'advancedAnalytics');
  const canExport = canAccessFeature(entitlements, 'exportCsv');

  const effectivePeriod: ReportPeriod =
    !canAdvanced && (period === 'yearly' || period === 'custom') ? 'monthly' : period;

  const range = useMemo(
    () => computeDateRange(effectivePeriod, new Date(), customStart, customEnd),
    [effectivePeriod, customStart, customEnd],
  );

  const report = useMemo(
    () =>
      computeProductivityReport(
        {
          tasks: tasksQuery.data ?? [],
          focusSessions: focusQuery.data ?? [],
          habits: habitsQuery.data ?? [],
          habitLogs: logsQuery.data ?? [],
          goals: goalsQuery.data ?? [],
          events: eventsQuery.data ?? [],
        },
        range,
      ),
    [
      tasksQuery.data,
      focusQuery.data,
      habitsQuery.data,
      logsQuery.data,
      goalsQuery.data,
      eventsQuery.data,
      range,
    ],
  );

  const handleExportCsv = () => {
    if (!canExport) return;
    const csv = exportReportToCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waqti-report-${range.startKey}-to-${range.endKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('reportsModule.exported'));
  };

  const maxTrendFocus = Math.max(30, ...report.trend.map((pt) => pt.focusMinutes));
  const totalTimeDist = Math.max(
    1,
    report.timeDistribution.focusMinutes +
      report.timeDistribution.scheduledTaskMinutes +
      report.timeDistribution.eventMinutes,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('reportsModule.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('reportsModule.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl<ReportPeriod>
            label={t('reportsModule.title')}
            value={period}
            onChange={setPeriod}
            size="sm"
            options={[
              { value: 'daily', label: t('reportsModule.periodDaily') },
              { value: 'weekly', label: t('reportsModule.periodWeekly') },
              { value: 'monthly', label: t('reportsModule.periodMonthly') },
              { value: 'yearly', label: t('reportsModule.periodYearly') },
              { value: 'custom', label: t('reportsModule.periodCustom') },
            ]}
          />
          <Button
            variant="outline"
            leadingIcon={<Download />}
            disabled={!canExport}
            onClick={handleExportCsv}
          >
            {t('reportsModule.exportCsv')}
          </Button>
        </div>
      </div>

      {!canAdvanced && (period === 'yearly' || period === 'custom' || !canExport) ? (
        <UpgradePrompt
          title={t('reportsModule.proAnalyticsGateTitle')}
          body={t('reportsModule.proAnalyticsGateBody')}
        />
      ) : null}

      {period === 'custom' && canAdvanced ? (
        <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          <Field label={t('reportsModule.startDate')} htmlFor="rep-start">
            <Input id="rep-start" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </Field>
          <Field label={t('reportsModule.endDate')} htmlFor="rep-end">
            <Input id="rep-end" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </Field>
        </Card>
      ) : null}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-ink-muted">{t('reportsModule.tasksCompleted')}</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {fmt.number(report.tasks.completed)} / {fmt.number(report.tasks.total)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">{fmt.percent(report.tasks.completionRate)}</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-ink-muted">{t('reportsModule.focusTime')}</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {fmt.duration(report.focus.totalMinutes)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {fmt.number(report.focus.sessionsCount)} · {fmt.duration(report.focus.averageMinutes)}
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-ink-muted">{t('reportsModule.habitConsistency')}</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-primary dark:text-primary-strong">
            {fmt.percent(report.habits.consistencyRate)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {fmt.number(report.habits.completedTotal)} / {fmt.number(report.habits.scheduledTotal)}
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-medium text-ink-muted">{t('reportsModule.goalProgress')}</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {fmt.percent(report.goals.averageProgress)}
          </p>
          <p className="mt-1 text-xs text-ink-subtle">
            {fmt.number(report.goals.activeCount)} / {fmt.number(report.goals.completedCount)}
          </p>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader title={t('reportsModule.trendTitle')} icon={<BarChart3 />} />
        <CardBody className="pt-4">
          <div className="flex items-end gap-2 overflow-x-auto pb-2">
            {report.trend.map((pt) => {
              const heightPct = Math.max(6, Math.round((pt.focusMinutes / maxTrendFocus) * 100));
              const d = fromDayKey(pt.dateKey);
              return (
                <div key={pt.dateKey} className="flex min-w-[34px] flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      title={`${pt.dateKey}: ${fmt.duration(pt.focusMinutes)} · ${pt.tasksCompleted} tasks`}
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[26px] rounded-t-lg bg-primary/80 transition-all hover:bg-primary"
                    />
                  </div>
                  <span className="tabular text-2xs text-ink-subtle">{fmt.shortDate(d)}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Priority Breakdown & Time Distribution */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('reportsModule.priorityBreakdown')} />
          <CardBody className="flex flex-col gap-3 pt-4">
            {PRIORITIES.map((p) => {
              const count = report.tasks.byPriority[p];
              const ratio = report.tasks.total === 0 ? 0 : count / report.tasks.total;
              return (
                <div key={p}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-ink">{t(`priority.${p}`)}</span>
                    <span className="tabular text-ink-subtle">{fmt.number(count)}</span>
                  </div>
                  <ProgressBar value={ratio} size="sm" label={t(`priority.${p}`)} />
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('reportsModule.timeDistribution')} />
          <CardBody className="flex flex-col gap-3 pt-4">
            {(
              [
                ['timeFocus', report.timeDistribution.focusMinutes, 'primary'],
                ['timeTasks', report.timeDistribution.scheduledTaskMinutes, 'accent'],
                ['timeEvents', report.timeDistribution.eventMinutes, 'success'],
              ] as const
            ).map(([key, mins, tone]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-ink">{t(`reportsModule.${key}`)}</span>
                  <span className="tabular text-ink-subtle">{fmt.duration(mins)}</span>
                </div>
                <ProgressBar value={mins / totalTimeDist} tone={tone} size="sm" label={t(`reportsModule.${key}`)} />
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
