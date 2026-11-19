import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useI18n } from '@/i18n';
import { Button, Field, Input } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

export function SignUpPage() {
  const { t } = useI18n();
  const { signUp, isSupabaseActive } = useAuth();
  const navigate = useNavigate();
  const id = useId();

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setPending(true);
    try {
      const { needsEmailConfirmation } = await signUp(email, password, firstName);
      if (needsEmailConfirmation) {
        setInfo(t('auth.checkEmailConfirm'));
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.error.hint'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title={t('auth.signUpTitle')} subtitle={t('auth.signUpSubtitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? (
          <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
            {error}
          </div>
        ) : null}
        {info ? (
          <div role="status" className="rounded-xl bg-success-soft px-3.5 py-2.5 text-xs font-medium text-success">
            {info}
          </div>
        ) : null}

        <Field label={t('auth.firstNameLabel')} htmlFor={`${id}-first`}>
          <Input
            id={`${id}-first`}
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('auth.firstNamePlaceholder')}
          />
        </Field>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
          />
        </Field>

        <Field label={t('auth.confirmPasswordLabel')} htmlFor={`${id}-confirm`}>
          <Input
            id={`${id}-confirm`}
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
          />
        </Field>

        <Button type="submit" loading={pending} disabled={!isSupabaseActive} className="mt-1 w-full">
          {pending ? t('auth.signingUp') : t('auth.signUp')}
        </Button>

        <p className="mt-2 text-center text-xs text-ink-muted">
          {t('auth.hasAccount')}{' '}
          <Link to="/auth/sign-in" className="font-semibold text-primary hover:underline dark:text-primary-strong">
            {t('auth.signIn')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
