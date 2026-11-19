import { MoonStar } from 'lucide-react';
import { useI18n } from '@/i18n';
import { ButtonLink, Card, CardBody, CardHeader } from '@/components/ui';

export interface SpiritualSummaryCardProps {
  summary: {
    quranPagesToday: number;
    quranDailyTarget: number;
    prayersCompletedToday: number;
    azkarCompletedToday: number;
  };
}

export function SpiritualSummaryCard({ summary }: SpiritualSummaryCardProps) {
  const { t, fmt } = useI18n();

  return (
    <Card>
      <CardHeader
        title={t('dashboard.spiritual.title')}
        icon={<MoonStar />}
        action={
          <ButtonLink to="/spiritual" variant="ghost" size="sm">
            {t('common.viewAll')}
          </ButtonLink>
        }
      />
      <CardBody className="grid grid-cols-3 gap-2.5 pt-4">
        <div className="rounded-xl border border-line/70 bg-surface-2 p-3 text-center">
          <p className="text-2xs text-ink-subtle">{t('dashboard.spiritual.quran')}</p>
          <p className="tabular mt-1 font-display text-base font-bold text-ink">
            {fmt.number(summary.quranPagesToday)}/{fmt.number(summary.quranDailyTarget)}
          </p>
        </div>
        <div className="rounded-xl border border-line/70 bg-surface-2 p-3 text-center">
          <p className="text-2xs text-ink-subtle">{t('dashboard.spiritual.prayers')}</p>
          <p className="tabular mt-1 font-display text-base font-bold text-ink">
            {fmt.number(summary.prayersCompletedToday)}/5
          </p>
        </div>
        <div className="rounded-xl border border-line/70 bg-surface-2 p-3 text-center">
          <p className="text-2xs text-ink-subtle">{t('dashboard.spiritual.azkar')}</p>
          <p className="tabular mt-1 font-display text-base font-bold text-ink">
            {fmt.number(summary.azkarCompletedToday)}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
