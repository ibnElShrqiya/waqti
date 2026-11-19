import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useI18n } from '@/i18n';
import { toast } from '@/stores/toast';
import { Button, Field, Input } from '@/components/ui';
import { AuthLayout } from './AuthLayout';

export function ResetPasswordPage() {
  const { t } = useI18n();
  const { updatePassword, isSupabaseActive } = useAuth();
  const navigate = useNavigate();
  const id = useId();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setPending(true);
    try {
      await updatePassword(password);
      toast.success(t('auth.passwordUpdated'));
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.error.hint'));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthLayout title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error ? (
          <div role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-medium text-danger">
            {error}
          </div>
        ) : null}

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
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
          />
        </Field>

        <Button type="submit" loading={pending} disabled={!isSupabaseActive} className="w-full">
          {pending ? t('auth.updatingPassword') : t('auth.updatePassword')}
        </Button>
      </form>
    </AuthLayout>
  );
}
