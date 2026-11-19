import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useI18n, type MessageKey } from '@/i18n';
import { Badge, ButtonLink, Card, CardBody } from '@/components/ui';

export interface ModulePlaceholderProps {
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  featuresKey: MessageKey;
  icon: LucideIcon;
  phase: number;
}

export function ModulePlaceholderPage({
  titleKey,
  descriptionKey,
  featuresKey,
  icon: Icon,
  phase,
}: ModulePlaceholderProps) {
  const { t, fmt } = useI18n();
  const features = t(featuresKey).split('·').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary dark:text-primary-strong">
            <Icon className="size-6" aria-hidden />
          </span>
          <Badge tone="accent">{t('modules.plannedFor', { n: fmt.number(phase) })}</Badge>
        </div>

        <h1 className="mt-5 text-2xl font-bold text-ink">{t(titleKey)}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t(descriptionKey)}</p>

        <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-subtle rtl:tracking-normal">
            {t('modules.whatsComing')}
          </p>
          <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-xs text-ink-muted">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <CardBody className="px-0 pb-0 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-subtle">{t('modules.notBuilt')}</p>
            <ButtonLink to="/" variant="outline" leadingIcon={<ArrowLeft className="rtl:-scale-x-100" />}>
              {t('modules.backToDashboard')}
            </ButtonLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
