import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useAuth } from './AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { isSupabaseActive, user, loading } = useAuth();
  const location = useLocation();

  if (!isSupabaseActive) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas text-sm text-ink-muted">
        {t('common.loading')}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
