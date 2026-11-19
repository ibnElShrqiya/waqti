import { Link, NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_GROUPS, visibleNavItems, type NavItem } from '@/config/navigation';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/stores/preferences';
import { useCurrentProfile } from '@/features/profile/useCurrentProfile';
import { Avatar } from '@/components/ui';
import { Logo } from './Logo';

interface SidebarProps {
  collapsed: boolean;
  canToggle: boolean;
}

export function Sidebar({ collapsed, canToggle }: SidebarProps) {
  const { t } = useI18n();
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const toggleSidebar = usePreferences((s) => s.toggleSidebar);
  const profile = useCurrentProfile();
  const items = visibleNavItems(spiritualEnabled, profile?.role === 'admin');

  return (
    <aside
      className={cn(
        'fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-line bg-surface/80 backdrop-blur-sm transition-[width] duration-300 ease-premium md:flex',
        collapsed ? 'w-[var(--sidebar-rail)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      <div className={cn('flex h-[var(--topbar-height)] items-center', collapsed ? 'justify-center' : 'justify-between px-5')}>
        <Link to="/" aria-label={t('app.name')} className="rounded-xl">
          <Logo name={t('app.name')} collapsed={collapsed} />
        </Link>
        {canToggle && !collapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={t('nav.collapse')}
            title={t('nav.collapse')}
            className="grid size-8 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-sunken hover:text-ink"
          >
            <PanelLeftClose className="size-4 rtl:-scale-x-100" />
          </button>
        ) : null}
      </div>

      <nav aria-label={t('nav.mainNavigation')} className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4 pt-2">
        {NAV_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group.id);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.id} className="mb-4 last:mb-0">
              {collapsed ? (
                <div aria-hidden className="mx-auto mb-2 mt-1 h-px w-6 bg-line first:hidden" />
              ) : (
                <p className="mb-1.5 px-3 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-subtle rtl:tracking-normal">
                  {t(group.labelKey)}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {groupItems.map((item) => (
                  <li key={item.id}>
                    <SidebarLink item={item} collapsed={collapsed} label={t(item.labelKey)} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className={cn('border-t border-line p-3', collapsed && 'flex flex-col items-center gap-2')}>
        {canToggle && collapsed ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={t('nav.expand')}
            title={t('nav.expand')}
            className="grid size-10 place-items-center rounded-xl text-ink-subtle transition-colors hover:bg-sunken hover:text-ink"
          >
            <PanelLeftOpen className="size-[1.125rem] rtl:-scale-x-100" />
          </button>
        ) : null}
        {profile ? (
          <Link
            to="/profile"
            className={cn(
              'flex items-center gap-3 rounded-xl transition-colors hover:bg-sunken/70',
              collapsed ? 'p-1' : 'p-2',
            )}
            title={collapsed ? profile.displayName : undefined}
          >
            <Avatar name={profile.displayName} src={profile.avatarUrl} size="sm" />
            {!collapsed ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{profile.displayName}</span>
                <span className="block truncate text-2xs text-ink-subtle">
                  {profile.plan === 'premium' ? t('common.premiumPlan') : t('common.freePlan')}
                </span>
              </span>
            ) : null}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

function SidebarLink({ item, collapsed, label }: { item: NavItem; collapsed: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex h-10 items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-200',
          collapsed ? 'mx-auto w-10 justify-center' : 'px-3',
          isActive
            ? 'bg-primary-soft text-primary dark:text-primary-strong'
            : 'text-ink-muted hover:bg-sunken/70 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed ? (
            <span aria-hidden className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-accent" />
          ) : null}
          <Icon className="size-[1.125rem] shrink-0" strokeWidth={isActive ? 2.25 : 1.9} />
          {!collapsed ? <span className="truncate">{label}</span> : null}
        </>
      )}
    </NavLink>
  );
}
