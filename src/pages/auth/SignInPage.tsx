import { useId, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useI18n } from '@/i18n';
import { Button, Field, Input } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

export function SignInPage() {
  const { t } = useI18n();
  const { signIn, isSupabaseActive } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const id = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.error.hint'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title={t('auth.signInTitle')} subtitle={t('auth.signInSubtitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? (
          <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
            {error}
          </div>
        ) : null}

        <Field label={t('auth.emailLabel')} htmlFor={`${id}-email`}>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
          />
        </Field>

        <Field label={t('auth.passwordLabel')} htmlFor={`${id}-password`}>
          <Input
            id={`${id}-password`}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
          />
        </Field>

        <div className="flex justify-end">
          <Link to="/auth/forgot-password" className="text-xs font-medium text-primary hover:underline dark:text-primary-strong">
            {t('auth.forgotLink')}
          </Link>
        </div>

        <Button type="submit" loading={pending} disabled={!isSupabaseActive} className="mt-1 w-full">
          {pending ? t('auth.signingIn') : t('auth.signIn')}
        </Button>

        <p className="mt-2 text-center text-xs text-ink-muted">
          {t('auth.noAccount')}{' '}
          <Link to="/auth/sign-up" className="font-semibold text-primary hover:underline dark:text-primary-strong">
            {t('auth.signUp')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
