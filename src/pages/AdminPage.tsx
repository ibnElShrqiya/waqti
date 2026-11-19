import { Activity, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { isSupabaseActive } from '@/data';
import {
  useAdminAuditLogs,
  useAdminConfig,
  useAdminMutations,
  useAdminOverview,
  useAdminUsers,
} from '@/features/admin/api/useAdmin';
import { useCurrentProfile } from '@/features/profile/useCurrentProfile';
import { useI18n } from '@/i18n';
import { toast } from '@/stores/toast';
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ProgressBar,
  Switch,
} from '@/components/ui';

export function AdminPage() {
  const { t, fmt } = useI18n();
  const profile = useCurrentProfile();
  const isAdmin = profile?.role === 'admin';

  const overviewQuery = useAdminOverview(isAdmin);
  const usersQuery = useAdminUsers(isAdmin);
  const configQuery = useAdminConfig(isAdmin);
  const logsQuery = useAdminAuditLogs(isAdmin);
  const mutations = useAdminMutations();

  if (profile && !isAdmin) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <Card className="p-6">
          <EmptyState
            icon={<ShieldAlert />}
            title={t('adminModule.accessDeniedTitle')}
            description={t('adminModule.accessDeniedBody')}
          />
        </Card>
      </div>
    );
  }

  const overview = overviewQuery.data;
  const users = usersQuery.data ?? [];
  const config = configQuery.data ?? [];
  const logs = logsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('adminModule.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('adminModule.subtitle')}</p>
        </div>
        <Badge tone="success">
          <Activity aria-hidden />
          <span>
            {t('adminModule.systemHealth')}: {t('adminModule.healthOk')}
          </span>
        </Badge>
      </div>

      {!isSupabaseActive ? (
        <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 p-4 text-xs text-ink">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
          <p className="leading-relaxed text-ink-muted">{t('adminModule.demoNotice')}</p>
        </div>
      ) : null}

      {overview ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card className="p-4 sm:p-5">
            <p className="text-xs text-ink-muted">{t('adminModule.totalUsers')}</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
              {fmt.number(overview.totalUsers)}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              {t('adminModule.proUsers')}: {fmt.number(overview.proUsers)} · {t('adminModule.freeUsers')}:{' '}
              {fmt.number(overview.freeUsers)}
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <p className="text-xs text-ink-muted">{t('adminModule.platformUsage')}</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
              {fmt.number(overview.totalTasks + overview.totalHabits + overview.totalGoals)}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              {fmt.number(overview.totalTasks)} · {fmt.number(overview.totalHabits)} ·{' '}
              {fmt.number(overview.totalGoals)}
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <p className="text-xs text-ink-muted">{t('adminModule.aiRequests')}</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
              {fmt.number(overview.aiRequests)}
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              {t('adminModule.aiCost')}: ${overview.aiEstimatedCost.toFixed(4)}
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <p className="text-xs text-ink-muted">Free vs Pro</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-primary dark:text-primary-strong">
              {fmt.percent(overview.totalUsers === 0 ? 0 : overview.proUsers / overview.totalUsers)}
            </p>
            <ProgressBar
              value={overview.totalUsers === 0 ? 0 : overview.proUsers / overview.totalUsers}
              size="sm"
              className="mt-2"
            />
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Users & Subscription Management */}
        <Card className="lg:col-span-7">
          <CardHeader title={t('adminModule.usersTitle')} icon={<Users />} />
          <CardBody className="overflow-x-auto pt-4">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-line text-ink-subtle">
                  <th className="pb-2 text-start font-medium">{t('profile.displayName')}</th>
                  <th className="pb-2 text-start font-medium">{t('adminModule.roleLabel')}</th>
                  <th className="pb-2 text-start font-medium">{t('adminModule.planLabel')}</th>
                  <th className="pb-2 text-start font-medium">{t('adminModule.statusLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 font-medium text-ink">{u.displayName}</td>
                    <td className="py-2.5">
                      <Badge tone={u.role === 'admin' ? 'accent' : 'neutral'}>{u.role}</Badge>
                    </td>
                    <td className="py-2.5">
                      <select
                        aria-label={`${u.displayName} plan`}
                        value={u.plan}
                        onChange={(e) => {
                          const planId = e.target.value as 'free' | 'pro';
                          void mutations.updateUserSubscription
                            .mutateAsync({ userId: u.id, planId, status: u.subscriptionStatus })
                            .then(() => toast.success(t('adminModule.updated')));
                        }}
                        className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-ink"
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                      </select>
                    </td>
                    <td className="py-2.5">
                      <Badge tone={u.subscriptionStatus === 'active' ? 'success' : 'warning'}>
                        {u.subscriptionStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Platform Configuration & Audit Logs */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card>
            <CardHeader title={t('adminModule.configTitle')} icon={<ShieldCheck />} />
            <CardBody className="flex flex-col gap-3 pt-4">
              {config.map((item) => {
                const enabled = Boolean((item.value as { enabled?: boolean }).enabled);
                return (
                  <label key={item.key} className="flex items-center justify-between gap-3 text-xs text-ink-muted">
                    <span className="font-mono">{item.key}</span>
                    <Switch
                      checked={enabled}
                      onChange={(next) =>
                        void mutations.updateConfig
                          .mutateAsync({ key: item.key, value: { enabled: next } })
                          .then(() => toast.success(t('adminModule.updated')))
                      }
                      label={item.key}
                    />
                  </label>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('adminModule.auditTitle')} />
            <CardBody className="pt-4">
              <ul className="flex flex-col gap-2">
                {logs.slice(0, 10).map((log) => (
                  <li key={log.id} className="rounded-xl border border-line/70 bg-surface-2 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{log.action}</span>
                      <span className="tabular text-2xs text-ink-subtle">
                        {fmt.shortDate(new Date(log.createdAt))} · {fmt.time(new Date(log.createdAt))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xs text-ink-muted">
                      {log.targetType}
                      {log.targetId ? ` · ${log.targetId}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
