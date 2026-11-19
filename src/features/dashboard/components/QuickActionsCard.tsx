import { Link } from 'react-router-dom';
import { CalendarDays, Plus, Sparkles, Timer } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useUI } from '@/stores/ui';
import { Card, CardBody, CardHeader } from '@/components/ui';

export function QuickActionsCard() {
  const { t } = useI18n();
  const openQuickAdd = useUI((s) => s.openQuickAdd);

  const linkClass =
    'flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken/60';

  return (
    <Card>
      <CardHeader title={t('dashboard.quickActions.title')} />
      <CardBody className="grid grid-cols-2 gap-2.5 pt-4">
        <button type="button" onClick={openQuickAdd} className={linkClass}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary dark:text-primary-strong">
            <Plus className="size-4" aria-hidden />
          </span>
          <span className="truncate text-start">{t('dashboard.quickActions.newTask')}</span>
        </button>

        <Link to="/focus" className={linkClass}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-strong">
            <Timer className="size-4" aria-hidden />
          </span>
          <span className="truncate">{t('dashboard.quickActions.startFocus')}</span>
        </Link>

        <Link to="/assistant" className={linkClass}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary dark:text-primary-strong">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span className="truncate">{t('dashboard.quickActions.planDay')}</span>
        </Link>

        <Link to="/calendar" className={linkClass}>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-info-soft text-info">
            <CalendarDays className="size-4" aria-hidden />
          </span>
          <span className="truncate">{t('dashboard.quickActions.addEvent')}</span>
        </Link>
      </CardBody>
    </Card>
  );
}
