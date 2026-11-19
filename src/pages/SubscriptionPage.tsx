import { Check, CreditCard, ShieldAlert, Sparkles } from 'lucide-react';
import { isSupabaseActive } from '@/data';
import {
  useCurrentSubscription,
  useEntitlements,
  useSubscriptionMutations,
  useSubscriptionPlans,
  useUsageSnapshot,
} from '@/features/subscription/api/useSubscription';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toast';
import { Badge, Button, Card, CardBody, CardHeader, ProgressBar } from '@/components/ui';

export function SubscriptionPage() {
  const { t, fmt, locale } = useI18n();
  const plansQuery = useSubscriptionPlans();
  const subQuery = useCurrentSubscription();
  const usageQuery = useUsageSnapshot();
  const entitlements = useEntitlements();
  const mutations = useSubscriptionMutations();

  const sub = subQuery.data;
  const usage = usageQuery.data ?? { activeHabits: 0, activeGoals: 0, aiRequestsToday: 0 };
  const plans = plansQuery.data ?? [];

  const handlePlanSwitch = async (target: 'free' | 'pro') => {
    try {
      const res = await mutations.requestPlanChange.mutateAsync(target);
      toast.success(res.message || t('subscriptionModule.planUpdated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('quickAdd.error'));
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('subscriptionModule.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('subscriptionModule.subtitle')}</p>
      </div>

      {!isSupabaseActive ? (
        <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent-soft/60 p-4 text-xs text-ink">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent-strong" aria-hidden />
          <p className="leading-relaxed text-ink-muted">{t('subscriptionModule.demoNotice')}</p>
        </div>
      ) : null}

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Card>
          <CardHeader
            title={t('subscriptionModule.currentPlan')}
            icon={<CreditCard />}
            action={
              <Badge tone={entitlements.effectivePlan === 'pro' ? 'accent' : 'primary'}>
                {entitlements.effectivePlan.toUpperCase()}
              </Badge>
            }
          />
          <CardBody className="flex flex-col gap-3 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">{t('subscriptionModule.statusLabel')}</span>
              <Badge tone="neutral">{sub?.status ?? 'active'}</Badge>
            </div>
            {entitlements.inGracePeriod ? (
              <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
                {t('subscriptionModule.gracePeriodNote')}
              </p>
            ) : null}
            {sub?.cancelAtPeriodEnd ? (
              <p className="text-xs text-ink-subtle">{t('subscriptionModule.cancelScheduled')}</p>
            ) : null}
            {entitlements.effectivePlan === 'pro' && !sub?.cancelAtPeriodEnd ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void mutations.cancelAtPeriodEnd
                    .mutateAsync()
                    .then(() => toast.success(t('subscriptionModule.planUpdated')))
                }
              >
                {t('subscriptionModule.cancelAtEnd')}
              </Button>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('subscriptionModule.usageTitle')} icon={<Sparkles />} />
          <CardBody className="flex flex-col gap-3 pt-4 text-xs">
            <div>
              <div className="mb-1 flex justify-between">
                <span className="text-ink-muted">{t('subscriptionModule.usageHabits')}</span>
                <span className="tabular font-semibold text-ink">
                  {fmt.number(usage.activeHabits)} /{' '}
                  {entitlements.limits.maxActiveHabits >= 9999
                    ? t('subscriptionModule.unlimited')
                    : fmt.number(entitlements.limits.maxActiveHabits)}
                </span>
              </div>
              <ProgressBar
                value={usage.activeHabits / Math.max(1, entitlements.limits.maxActiveHabits)}
                size="sm"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between">
                <span className="text-ink-muted">{t('subscriptionModule.usageGoals')}</span>
                <span className="tabular font-semibold text-ink">
                  {fmt.number(usage.activeGoals)} /{' '}
                  {entitlements.limits.maxActiveGoals >= 9999
                    ? t('subscriptionModule.unlimited')
                    : fmt.number(entitlements.limits.maxActiveGoals)}
                </span>
              </div>
              <ProgressBar
                value={usage.activeGoals / Math.max(1, entitlements.limits.maxActiveGoals)}
                size="sm"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between">
                <span className="text-ink-muted">{t('subscriptionModule.usageAi')}</span>
                <span className="tabular font-semibold text-ink">
                  {fmt.number(usage.aiRequestsToday)} / {fmt.number(entitlements.limits.dailyAiRequests)}
                </span>
              </div>
              <ProgressBar
                value={usage.aiRequestsToday / Math.max(1, entitlements.limits.dailyAiRequests)}
                size="sm"
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {(['free', 'pro'] as const).map((planId) => {
          const isPro = planId === 'pro';
          const isCurrent = entitlements.effectivePlan === planId;
          const features = t(isPro ? 'subscriptionModule.featuresPro' : 'subscriptionModule.featuresFree')
            .split('·')
            .map((s) => s.trim());
          const remotePlan = plans.find((p) => p.id === planId);

          return (
            <Card
              key={planId}
              className={cn(
                'flex flex-col justify-between p-6',
                isPro && 'border-accent/60 ring-1 ring-accent/30',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-ink">
                    {isPro ? t('subscriptionModule.proTitle') : t('subscriptionModule.freeTitle')}
                  </h2>
                  {isCurrent ? (
                    <Badge tone="success">{t('subscriptionModule.currentPlan')}</Badge>
                  ) : null}
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-primary dark:text-primary-strong">
                  {isPro ? t('subscriptionModule.proPrice') : t('subscriptionModule.freePrice')}
                </p>
                {remotePlan?.description && locale === 'en' ? (
                  <p className="mt-1.5 text-xs text-ink-muted">{remotePlan.description}</p>
                ) : null}

                <ul className="mt-5 flex flex-col gap-2">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-ink-muted">
                      <Check className="size-4 shrink-0 text-primary dark:text-primary-strong" aria-hidden />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="outline" disabled className="w-full">
                    {t('subscriptionModule.currentPlan')}
                  </Button>
                ) : (
                  <Button
                    variant={isPro ? 'accent' : 'outline'}
                    className="w-full"
                    loading={mutations.requestPlanChange.isPending}
                    onClick={() => void handlePlanSwitch(planId)}
                  >
                    {isPro ? t('subscriptionModule.upgradeToPro') : t('subscriptionModule.downgradeToFree')}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
