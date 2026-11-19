import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import type { NotificationItem } from '@/domain/types';
import { useI18n } from '@/i18n';
import { Badge, ButtonLink, Card, CardBody, CardHeader, EmptyState } from '@/components/ui';

export interface NotificationsCardProps {
  notifications: NotificationItem[];
}

export function NotificationsCard({ notifications }: NotificationsCardProps) {
  const { t, fmt } = useI18n();
  const unread = notifications.filter((n) => n.status !== 'read');

  return (
    <Card>
      <CardHeader
        title={t('dashboard.notifications.title')}
        icon={<Bell />}
        action={
          <ButtonLink to="/notifications" variant="ghost" size="sm">
            {t('common.viewAll')}
          </ButtonLink>
        }
      />
      <CardBody className="pt-4">
        {unread.length === 0 ? (
          <EmptyState icon={<Bell />} title={t('dashboard.notifications.empty')} compact />
        ) : (
          <ul className="flex flex-col gap-2">
            {unread.slice(0, 3).map((n) => (
              <li key={n.id}>
                <Link
                  to={n.actionUrl ?? '/notifications'}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line/70 bg-surface-2 px-3.5 py-2.5 transition-colors hover:border-line-strong"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{n.title}</p>
                    {n.body ? <p className="truncate text-xs text-ink-muted">{n.body}</p> : null}
                  </div>
                  <Badge tone="primary" className="tabular shrink-0">
                    {fmt.time(new Date(n.scheduledAt))}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
