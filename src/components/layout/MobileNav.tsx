import { NavLink } from 'react-router-dom';
import { LayoutGrid, Plus } from 'lucide-react';
import { NAV_ITEMS, visibleNavItems, type NavItem } from '@/config/navigation';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { useCurrentProfile } from '@/features/profile/useCurrentProfile';
import { usePreferences, type ThemePreference } from '@/stores/preferences';
import { useUI } from '@/stores/ui';
import { Dialog, SegmentedControl } from '@/components/ui';
import { LOCALES, SUPPORTED_LOCALES } from '@/i18n/config';
import type { Locale } from '@/i18n/types';

const PRIMARY = NAV_ITEMS.filter((i) => i.mobilePrimary);

export function MobileNav() {
  const { t } = useI18n();
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const moreOpen = useUI((s) => s.mobileMoreOpen);
  const setMoreOpen = useUI((s) => s.setMobileMoreOpen);
  const [first, second, third] = PRIMARY;

  return (
    <>
      <nav
        aria-label={t('nav.mobileNavigation')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid h-[var(--mobile-nav-height)] max-w-lg grid-cols-5 items-center px-2">
          {first ? <MobileTab item={first} label={t(first.labelKey)} /> : null}
          {second ? <MobileTab item={second} label={t(second.labelKey)} /> : null}
          <li className="flex justify-center">
            <button
              type="button"
              onClick={openQuickAdd}
              aria-label={t('topbar.newTask')}
              className="grid size-12 -translate-y-2 place-items-center rounded-2xl bg-primary text-primary-fg shadow-raised ring-4 ring-canvas transition-transform active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.25} />
            </button>
          </li>
          {third ? <MobileTab item={third} label={t(third.labelKey)} /> : null}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(tabClass, moreOpen ? 'text-primary dark:text-primary-strong' : 'text-ink-subtle')}
            >
              <LayoutGrid className="size-[1.375rem]" strokeWidth={1.9} />
              <span>{t('nav.more')}</span>
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

const tabClass =
  'flex w-full flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-2xs font-medium transition-colors';

function MobileTab({ item, label }: { item: NavItem; label: string }) {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) =>
          cn(tabClass, isActive ? 'text-primary dark:text-primary-strong' : 'text-ink-subtle hover:text-ink')
        }
      >
        {({ isActive }) => (
          <>
            <Icon className="size-[1.375rem]" strokeWidth={isActive ? 2.25 : 1.9} />
            <span className="max-w-full truncate">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const profile = useCurrentProfile();
  const items = visibleNavItems(spiritualEnabled, profile?.role === 'admin').filter((i) => !i.mobilePrimary);
  const featured = items.find((i) => i.id === 'assistant');
  const rest = items.filter((i) => i.id !== 'assistant');

  return (
    <Dialog open={open} onClose={onClose} title={t('nav.more')} variant="sheet" closeLabel={t('common.close')}>
      <div className="flex flex-col gap-5 pb-3">
        {featured ? (
          <NavLink
            to={featured.path}
            onClick={onClose}
            className="flex items-center gap-3 rounded-2xl bg-hero p-4 text-hero-fg"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent">
              <featured.icon className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block font-display text-sm font-semibold">{t(featured.labelKey)}</span>
              <span className="block text-xs text-hero-muted">{t('dashboard.insights.subtitle')}</span>
            </span>
          </NavLink>
        ) : null}

        <ul className="grid grid-cols-3 gap-2">
          {rest.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border text-center text-xs font-medium transition-colors',
                    isActive
                      ? 'border-primary/30 bg-primary-soft text-primary dark:text-primary-strong'
                      : 'border-line bg-surface-2 text-ink-muted hover:text-ink',
                  )
                }
              >
                <item.icon className="size-5" />
                <span className="px-1 leading-tight">{t(item.labelKey)}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2 p-3">
          <SegmentedControl<ThemePreference>
            label={t('theme.label')}
            value={theme}
            onChange={setTheme}
            size="sm"
            className="w-full"
            options={[
              { value: 'light', label: t('theme.light') },
              { value: 'dark', label: t('theme.dark') },
              { value: 'system', label: t('theme.system') },
            ]}
          />
          <SegmentedControl<Locale>
            label={t('topbar.switchLanguage')}
            value={locale}
            onChange={setLocale}
            size="sm"
            className="w-full"
            options={SUPPORTED_LOCALES.map((code) => ({ value: code, label: LOCALES[code].nativeName }))}
          />
        </div>
      </div>
    </Dialog>
  );
}
