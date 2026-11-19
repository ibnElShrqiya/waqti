import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';

const TasksPage = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const CalendarPage = lazy(() => import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const HabitsPage = lazy(() => import('@/pages/HabitsPage').then((m) => ({ default: m.HabitsPage })));
const GoalsPage = lazy(() => import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })));
const FocusPage = lazy(() => import('@/pages/FocusPage').then((m) => ({ default: m.FocusPage })));
const SpiritualPage = lazy(() => import('@/pages/SpiritualPage').then((m) => ({ default: m.SpiritualPage })));
const AssistantPage = lazy(() => import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const NotificationsPage = lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SubscriptionPage = lazy(() =>
  import('@/pages/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })),
);
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 py-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function ShellLayout() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Outlet />
      </AppShell>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  { path: '/auth/sign-in', element: <SignInPage /> },
  { path: '/auth/sign-up', element: <SignUpPage /> },
  { path: '/auth/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ShellLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/tasks', element: <Lazy><TasksPage /></Lazy> },
      { path: '/calendar', element: <Lazy><CalendarPage /></Lazy> },
      { path: '/habits', element: <Lazy><HabitsPage /></Lazy> },
      { path: '/goals', element: <Lazy><GoalsPage /></Lazy> },
      { path: '/focus', element: <Lazy><FocusPage /></Lazy> },
      { path: '/spiritual', element: <Lazy><SpiritualPage /></Lazy> },
      { path: '/assistant', element: <Lazy><AssistantPage /></Lazy> },
      { path: '/reports', element: <Lazy><ReportsPage /></Lazy> },
      { path: '/notifications', element: <Lazy><NotificationsPage /></Lazy> },
      { path: '/profile', element: <Lazy><ProfilePage /></Lazy> },
      { path: '/settings', element: <Lazy><SettingsPage /></Lazy> },
      { path: '/subscription', element: <Lazy><SubscriptionPage /></Lazy> },
      { path: '/admin', element: <Lazy><AdminPage /></Lazy> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
