import { Calendar, Plus } from 'lucide-react';
import type { DataSourceKind } from '@/domain/types';
import { useI18n } from '@/i18n';
import { getDayPeriod } from '@/lib/date';
import { usePreferences } from '@/stores/preferences';
import { useUI } from '@/stores/ui';
import { Badge, Button } from '@/components/ui';

export interface DashboardHeaderProps {
  firstName: string;
  now: Date;
  source: DataSourceKind;
}

export function DashboardHeader({ firstName, now, source }: DashboardHeaderProps) {
  const { t, fmt } = useI18n();
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const period = getDayPeriod(now);

  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Calendar className="size-3.5 text-primary dark:text-primary-strong" aria-hidden />
            {fmt.longDate(now)}
          </span>
          {spiritualEnabled ? (
            <>
              <span aria-hidden className="text-line-strong">
                ·
              </span>
              <span className="text-ink-subtle">{fmt.hijriDate(now)}</span>
            </>
          ) : null}
          {source === 'mock' ? (
            <Badge tone="accent" title={t('common.demoDataHint')}>
              {t('common.demoData')}
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-[1.875rem]">
          {t(`greeting.${period}`, { name: firstName })}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('greeting.subtitle')}</p>
      </div>

      <div className="hidden items-center gap-2 sm:flex md:hidden">
        <Button onClick={openQuickAdd} leadingIcon={<Plus />}>
          {t('topbar.newTask')}
        </Button>
      </div>
    </section>
  );
}
