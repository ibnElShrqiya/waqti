import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Bell, Cloud, Languages, Moon, Plus, RefreshCw, Sun, WifiOff } from 'lucide-react';
import { findNavItem } from '@/config/navigation';
import { useI18n } from '@/i18n';
import { useResolvedTheme } from '@/app/DocumentSync';
import { useOfflineSync } from '@/features/offline/useOfflineSync';
import { usePreferences } from '@/stores/preferences';
import { useUI } from '@/stores/ui';
import { useCurrentProfile } from '@/features/profile/useCurrentProfile';
import { Avatar, Button, Dialog } from '@/components/ui';
import { Logo } from './Logo';

export function Topbar() {
  const { t, fmt, locale, setLocale } = useI18n();
  const { pathname } = useLocation();
  const resolvedTheme = useResolvedTheme();
  const setTheme = usePreferences((s) => s.setTheme);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const { online, syncing, pendingCount, conflictCount, conflicts, syncNow, resolveConflict } =
    useOfflineSync();
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const profile = useCurrentProfile();
  const current = findNavItem(pathname);

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const nextLocale = locale === 'ar' ? 'en' : 'ar';

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-[var(--topbar-height)] max-w-[1400px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="rounded-xl md:hidden" aria-label={t('app.name')}>
          <Logo name={t('app.name')} />
        </Link>

        <p className="hidden truncate font-display text-sm font-medium text-ink-muted md:block">
          {current ? t(current.labelKey) : null}
        </p>

        <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
          {conflictCount > 0 ? (
            <button
              type="button"
              onClick={() => setConflictsOpen(true)}
              className="me-1 inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger"
            >
              <AlertTriangle className="size-3.5" aria-hidden />
              <span>{t('sync.conflict', { count: fmt.number(conflictCount) })}</span>
            </button>
          ) : !online ? (
            <span
              role="status"
              title={t('topbar.offlineHint')}
              className="me-1 inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning"
            >
              <WifiOff className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">
                {pendingCount > 0
                  ? `${t('topbar.offline')} (${fmt.number(pendingCount)})`
                  : t('topbar.offline')}
              </span>
            </span>
          ) : syncing ? (
            <span className="me-1 hidden items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex dark:text-primary-strong">
              <RefreshCw className="size-3 animate-spin" aria-hidden />
              <span>{t('sync.syncing')}</span>
            </span>
          ) : pendingCount > 0 ? (
            <button
              type="button"
              onClick={() => void syncNow()}
              className="me-1 hidden items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-strong sm:inline-flex"
            >
              <RefreshCw className="size-3" aria-hidden />
              <span>{t('sync.pending', { count: fmt.number(pendingCount) })}</span>
            </button>
          ) : (
            <span
              title={t('sync.synced')}
              className="me-1 hidden items-center gap-1 text-xs text-ink-subtle lg:inline-flex"
            >
              <Cloud className="size-4 text-success" aria-hidden />
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(nextLocale)}
            aria-label={t('topbar.switchLanguage')}
            title={t('topbar.switchLanguage')}
            lang={nextLocale}
          >
            <Languages />
            <span className="sr-only">{nextLocale === 'ar' ? 'العربية' : 'English'}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(nextTheme)}
            aria-label={t('theme.toggle', { mode: t(`theme.${nextTheme}`) })}
            title={t('theme.toggle', { mode: t(`theme.${nextTheme}`) })}
          >
            {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
          </Button>

          <Link
            to="/notifications"
            aria-label={t('topbar.notifications')}
            title={t('topbar.notifications')}
            className="grid size-10 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-sunken/70 hover:text-ink"
          >
            <Bell className="size-[1.125rem]" />
          </Link>

          <Button onClick={openQuickAdd} leadingIcon={<Plus />} className="ms-1 hidden md:inline-flex">
            {t('topbar.newTask')}
          </Button>

          {profile ? (
            <Link to="/profile" aria-label={t('topbar.account')} className="ms-1 rounded-full md:hidden">
              <Avatar name={profile.displayName} src={profile.avatarUrl} size="sm" />
            </Link>
          ) : null}
        </div>
      </div>

      <Dialog
        open={conflictsOpen}
        onClose={() => setConflictsOpen(false)}
        title={t('sync.conflictTitle')}
        closeLabel={t('common.close')}
      >
        <div className="flex flex-col gap-3">
          {conflicts.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-surface-2 p-3 text-xs">
              <p className="font-semibold text-ink">
                {c.entityType} · {c.operation}
              </p>
              {c.lastError ? <p className="mt-1 text-ink-muted">{c.lastError}</p> : null}
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => c.id && void resolveConflict(c.id, 'keep_local')}>
                  {t('sync.keepLocal')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => c.id && void resolveConflict(c.id, 'accept_server')}>
                  {t('sync.acceptServer')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </header>
  );
}
