import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, CheckCheck, Sliders, X } from 'lucide-react';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/domain/notifications';
import type { NotificationPreferences } from '@/domain/types';
import {
  useNotificationMutations,
  useNotificationPreferences,
  useNotificationsList,
} from '@/features/notifications/api/useNotifications';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import {
  getNotificationPermission,
  isWebPushSupported,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from '@/lib/push';
import { toast } from '@/stores/toast';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Switch,
} from '@/components/ui';

export function NotificationsPage() {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const listQuery = useNotificationsList();
  const prefsQuery = useNotificationPreferences();
  const mutations = useNotificationMutations();

  const prefs = prefsQuery.data ?? DEFAULT_NOTIFICATION_PREFERENCES;
  const [draft, setDraft] = useState<NotificationPreferences>(prefs);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    setDraft(prefs);
  }, [prefs]);

  const notifications = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const pushSupported = isWebPushSupported();
  const permission = getNotificationPermission();

  const handleEnablePush = async () => {
    const sub = await subscribeToWebPush();
    if (!sub || !sub.endpoint) {
      toast.error(t('notificationsModule.pushDeniedMsg'));
      return;
    }
    await mutations.savePushSubscription.mutateAsync({ endpoint: sub.endpoint, subscription: sub });
    setPushSubscribed(true);
    toast.success(t('notificationsModule.pushEnabledMsg'));
  };

  const handleDisablePush = async () => {
    const endpoint = await unsubscribeFromWebPush();
    if (endpoint) {
      await mutations.removePushSubscription.mutateAsync(endpoint);
    }
    setPushSubscribed(false);
    toast.success(t('notificationsModule.pushDisabledMsg'));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('notificationsModule.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('notificationsModule.subtitle')}</p>
        </div>
        {notifications.some((n) => n.status !== 'read') ? (
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<CheckCheck />}
            onClick={() => void mutations.markAllRead.mutateAsync()}
          >
            {t('notificationsModule.markAllRead')}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Notifications Inbox */}
        <Card className="lg:col-span-7">
          <CardHeader title={t('notificationsModule.title')} icon={<Bell />} />
          <CardBody className="pt-4">
            {notifications.length === 0 ? (
              <EmptyState
                icon={<BellOff />}
                title={t('notificationsModule.emptyTitle')}
                description={t('notificationsModule.emptyHint')}
              />
            ) : (
              <ul className="flex flex-col gap-2.5">
                {notifications.map((n) => {
                  const isRead = n.status === 'read';
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        'flex items-start justify-between gap-3 rounded-2xl border p-3.5 transition-colors',
                        isRead
                          ? 'border-line/60 bg-surface opacity-75'
                          : 'border-primary/30 bg-surface-2',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!isRead) void mutations.markRead.mutateAsync(n.id);
                          if (n.actionUrl) navigate(n.actionUrl);
                        }}
                        className="min-w-0 flex-1 text-start"
                      >
                        <div className="flex items-center gap-2">
                          <Badge tone={isRead ? 'neutral' : 'primary'}>{n.type}</Badge>
                          <span className="tabular text-2xs text-ink-subtle">
                            {fmt.time(new Date(n.scheduledAt))}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-ink">{n.title}</p>
                        {n.body ? <p className="mt-0.5 text-xs text-ink-muted">{n.body}</p> : null}
                      </button>

                      <div className="flex shrink-0 items-center gap-1">
                        {!isRead ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('notificationsModule.markRead')}
                            onClick={() => void mutations.markRead.mutateAsync(n.id)}
                          >
                            <Check />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('notificationsModule.dismiss')}
                          onClick={() => void mutations.dismiss.mutateAsync(n.id)}
                        >
                          <X />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Preferences & Push */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          <Card>
            <CardHeader title={t('notificationsModule.pushTitle')} icon={<Bell />} />
            <CardBody className="flex flex-col gap-3 pt-4">
              <p className="text-xs leading-relaxed text-ink-muted">
                {pushSupported ? t('notificationsModule.pushSupported') : t('notificationsModule.pushUnsupported')}
              </p>
              <div className="flex items-center justify-between gap-2">
                <Badge tone={permission === 'granted' ? 'success' : 'neutral'}>{permission}</Badge>
                {pushSupported ? (
                  pushSubscribed ? (
                    <Button variant="outline" size="sm" onClick={() => void handleDisablePush()}>
                      {t('notificationsModule.pushDisable')}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void handleEnablePush()}>
                      {t('notificationsModule.pushEnable')}
                    </Button>
                  )
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t('notificationsModule.prefsTitle')} icon={<Sliders />} />
            <CardBody className="flex flex-col gap-4 pt-4">
              <div className="flex flex-col gap-2.5">
                {(
                  [
                    ['tasks', 'catTasks'],
                    ['calendar', 'catCalendar'],
                    ['habits', 'catHabits'],
                    ['goals', 'catGoals'],
                    ['focus', 'catFocus'],
                    ['spiritual', 'catSpiritual'],
                    ['summaries', 'catSummaries'],
                    ['sound', 'soundLabel'],
                  ] as const
                ).map(([key, labelKey]) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-xs text-ink-muted">
                    <span>{t(`notificationsModule.${labelKey}`)}</span>
                    <Switch
                      checked={draft.settings[key]}
                      onChange={(val) =>
                        setDraft({ ...draft, settings: { ...draft.settings, [key]: val } })
                      }
                      label={t(`notificationsModule.${labelKey}`)}
                    />
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('notificationsModule.leadMinutes')} htmlFor="np-lead">
                  <Input
                    id="np-lead"
                    type="number"
                    min={0}
                    max={120}
                    value={draft.settings.leadMinutes}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: { ...draft.settings, leadMinutes: Math.max(0, Number(e.target.value) || 0) },
                      })
                    }
                  />
                </Field>
                <Field label={t('notificationsModule.dailyLimit')} htmlFor="np-limit">
                  <Input
                    id="np-limit"
                    type="number"
                    min={1}
                    max={100}
                    value={draft.settings.dailyLimit}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: { ...draft.settings, dailyLimit: Math.max(1, Number(e.target.value) || 20) },
                      })
                    }
                  />
                </Field>
              </div>

              <div className="rounded-2xl border border-line bg-surface-2 p-3.5">
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-ink">
                  <span>{t('notificationsModule.quietHoursEnable')}</span>
                  <Switch
                    checked={draft.quietHours.enabled}
                    onChange={(enabled) =>
                      setDraft({ ...draft, quietHours: { ...draft.quietHours, enabled } })
                    }
                    label={t('notificationsModule.quietHoursEnable')}
                  />
                </label>
                {draft.quietHours.enabled ? (
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <Field label={t('notificationsModule.quietStart')} htmlFor="qh-start">
                      <Input
                        id="qh-start"
                        type="time"
                        value={draft.quietHours.start}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            quietHours: { ...draft.quietHours, start: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label={t('notificationsModule.quietEnd')} htmlFor="qh-end">
                      <Input
                        id="qh-end"
                        type="time"
                        value={draft.quietHours.end}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            quietHours: { ...draft.quietHours, end: e.target.value },
                          })
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <Field label={t('notificationsModule.timezoneLabel')} htmlFor="np-tz">
                <Input
                  id="np-tz"
                  value={draft.timezone}
                  onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                />
              </Field>

              <Button
                onClick={() =>
                  void mutations.updatePreferences
                    .mutateAsync(draft)
                    .then(() => toast.success(t('notificationsModule.prefsSaved')))
                }
                loading={mutations.updatePreferences.isPending}
              >
                {t('notificationsModule.savePrefs')}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
