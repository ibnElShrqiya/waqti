import { AlertTriangle, PartyPopper, Sparkles, TrendingUp } from 'lucide-react';
import type { Insight, InsightKind } from '@/domain/types';
import { useI18n } from '@/i18n';
import { Badge, ButtonLink, Card, CardBody, CardHeader, type BadgeTone } from '@/components/ui';

const INSIGHT_STYLE: Record<InsightKind, { icon: typeof Sparkles; tone: BadgeTone }> = {
  suggestion: { icon: Sparkles, tone: 'primary' },
  pattern: { icon: TrendingUp, tone: 'info' },
  celebration: { icon: PartyPopper, tone: 'success' },
  warning: { icon: AlertTriangle, tone: 'warning' },
};

export interface RafiqInsightsCardProps {
  insights: Insight[];
  isDemo: boolean;
}

export function RafiqInsightsCard({ insights, isDemo }: RafiqInsightsCardProps) {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader
        title={t('dashboard.insights.title')}
        description={t('dashboard.insights.subtitle')}
        icon={<Sparkles />}
        action={
          <ButtonLink to="/assistant" variant="outline" size="sm">
            {t('dashboard.insights.ask')}
          </ButtonLink>
        }
      />

      <CardBody className="flex flex-col gap-3 pt-4">
        {insights.map((insight) => {
          const style = INSIGHT_STYLE[insight.kind];
          const Icon = style.icon;
          return (
            <div key={insight.id} className="rounded-2xl border border-line/70 bg-surface-2 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{insight.title}</p>
                <Badge tone={style.tone}>
                  <Icon aria-hidden />
                  <span>{t(`dashboard.insights.kinds.${insight.kind}`)}</span>
                </Badge>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{insight.body}</p>
            </div>
          );
        })}

        {isDemo ? (
          <p className="text-2xs text-ink-subtle">{t('dashboard.insights.sampleNote')}</p>
        ) : null}
      </CardBody>
    </Card>
  );
}
