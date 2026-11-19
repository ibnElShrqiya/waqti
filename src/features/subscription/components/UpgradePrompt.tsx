import { Sparkles } from 'lucide-react';
import { useI18n } from '@/i18n';
import { ButtonLink, Card } from '@/components/ui';

export function UpgradePrompt({ title, body }: { title: string; body: string }) {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col items-start justify-between gap-4 border-accent/40 bg-accent-soft/40 p-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{body}</p>
        </div>
      </div>
      <ButtonLink to="/subscription" variant="accent" size="sm" className="shrink-0">
        {t('subscriptionModule.upgradeCta')}
      </ButtonLink>
    </Card>
  );
}
