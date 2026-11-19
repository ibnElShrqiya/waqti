import {
  BarChart3,
  Bell,
  CalendarDays,
  CheckSquare,
  CreditCard,
  Flag,
  LayoutDashboard,
  MoonStar,
  Repeat,
  Settings,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { MessageKey } from '@/i18n/types';

export type NavGroup = 'workspace' | 'life' | 'insights' | 'account';

export interface NavItem {
  id: string;
  path: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  group: NavGroup;
  /** Shown directly in the mobile bottom bar (max 4). */
  mobilePrimary?: boolean;
  /** Hidden unless the user enabled the Spiritual Life section. */
  spiritual?: boolean;
  /** Shown only to admin accounts. */
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', path: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, group: 'workspace', mobilePrimary: true },
  { id: 'tasks', path: '/tasks', labelKey: 'nav.tasks', icon: CheckSquare, group: 'workspace', mobilePrimary: true },
  { id: 'calendar', path: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays, group: 'workspace', mobilePrimary: true },
  { id: 'habits', path: '/habits', labelKey: 'nav.habits', icon: Repeat, group: 'workspace' },
  { id: 'goals', path: '/goals', labelKey: 'nav.goals', icon: Flag, group: 'workspace' },
  { id: 'focus', path: '/focus', labelKey: 'nav.focus', icon: Timer, group: 'workspace' },
  { id: 'spiritual', path: '/spiritual', labelKey: 'nav.spiritual', icon: MoonStar, group: 'life', spiritual: true },
  { id: 'assistant', path: '/assistant', labelKey: 'nav.assistant', icon: Sparkles, group: 'life' },
  { id: 'reports', path: '/reports', labelKey: 'nav.reports', icon: BarChart3, group: 'insights' },
  { id: 'notifications', path: '/notifications', labelKey: 'nav.notifications', icon: Bell, group: 'insights' },
  { id: 'profile', path: '/profile', labelKey: 'nav.profile', icon: UserRound, group: 'account' },
  { id: 'settings', path: '/settings', labelKey: 'nav.settings', icon: Settings, group: 'account' },
  { id: 'subscription', path: '/subscription', labelKey: 'nav.subscription', icon: CreditCard, group: 'account' },
  { id: 'admin', path: '/admin', labelKey: 'nav.admin', icon: ShieldCheck, group: 'account', adminOnly: true },
];

export const NAV_GROUPS: { id: NavGroup; labelKey: MessageKey }[] = [
  { id: 'workspace', labelKey: 'nav.groups.workspace' },
  { id: 'life', labelKey: 'nav.groups.life' },
  { id: 'insights', labelKey: 'nav.groups.insights' },
  { id: 'account', labelKey: 'nav.groups.account' },
];

export function visibleNavItems(spiritualEnabled: boolean, isAdmin = false): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => (spiritualEnabled || !item.spiritual) && (isAdmin || !item.adminOnly),
  );
}

export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)));
}
