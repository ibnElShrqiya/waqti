import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useI18n } from '@/i18n';
import { Button, Field, Input } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const { resetPasswordForEmail, isSupabaseActive } = useAuth();
  const id = useId();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await resetPasswordForEmail(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.error.hint'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? (
          <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
            {error}
          </div>
        ) : null}
        {sent ? (
          <div role="status" className="rounded-xl bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success">
            {t('auth.resetSent')}
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

        <Button type="submit" loading={pending} disabled={!isSupabaseActive} className="w-full">
          {pending ? t('auth.sendingReset') : t('auth.sendReset')}
        </Button>

        <p className="mt-2 text-center text-xs text-ink-muted">
          <Link to="/auth/sign-in" className="font-semibold text-primary hover:underline dark:text-primary-strong">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
