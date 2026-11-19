import type { ReactNode } from 'react';
import { useHotkey } from '@/hooks/useHotkey';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { usePreferences } from '@/stores/preferences';
import { useUI } from '@/stores/ui';
import { Toaster } from '@/components/ui';
import { QuickAddTaskDialog } from '@/features/tasks/components/QuickAddTaskDialog';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const sidebarCollapsed = usePreferences((s) => s.sidebarCollapsed);
  const openQuickAdd = useUI((s) => s.openQuickAdd);

  // Tablets (md..lg) always show the compact icon rail; desktop follows user preference.
  const collapsed = isDesktop ? sidebarCollapsed : true;

  useHotkey('n', openQuickAdd);

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-fg focus:shadow-raised"
      >
        {t('app.skipToContent')}
      </a>

      <Sidebar collapsed={collapsed} canToggle={isDesktop} />

      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-300 ease-premium',
          collapsed ? 'md:ps-[var(--sidebar-rail)]' : 'md:ps-[var(--sidebar-width)]',
        )}
      >
        <Topbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-[calc(var(--mobile-nav-height)+2rem+env(safe-area-inset-bottom))] pt-5 focus:outline-none sm:px-6 sm:pt-6 md:pb-10 lg:px-8"
        >
          {children}
        </main>
      </div>

      <MobileNav />
      <QuickAddTaskDialog />
      <Toaster closeLabel={t('common.close')} />
    </div>
  );
}
