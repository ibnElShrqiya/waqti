import { ArrowLeft, Compass } from 'lucide-react';
import { useI18n } from '@/i18n';
import { ButtonLink, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="py-16">
      <EmptyState
        icon={<Compass />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <ButtonLink to="/" variant="primary" leadingIcon={<ArrowLeft className="rtl:-scale-x-100" />}>
            {t('modules.backToDashboard')}
          </ButtonLink>
        }
      />
    </div>
  );
}
