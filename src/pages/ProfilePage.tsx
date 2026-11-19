import { useEffect, useId, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, UserRound } from 'lucide-react';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import { useAuth } from '@/features/auth/AuthContext';
import { useCurrentProfile } from '@/features/profile/useCurrentProfile';
import { useI18n } from '@/i18n';
import { toast } from '@/stores/toast';
import { Avatar, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Field, Input, Skeleton } from '@/components/ui';

export function ProfilePage() {
  const { t } = useI18n();
  const { isSupabaseActive, user, signOut } = useAuth();
  const profile = useCurrentProfile();
  const qc = useQueryClient();
  const id = useId();

  const [firstName, setFirstName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('');

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setDisplayName(profile.displayName);
      setTimezone(profile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: () => repositories.profile.update({ firstName, displayName, timezone }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.profile.all });
      void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success(t('profile.saved'));
    },
    onError: () => toast.error(t('profile.saveError')),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateProfile.mutate();
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('profile.subtitle')}</p>
      </div>

      {!isSupabaseActive ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent-soft/50 p-4 text-xs text-ink">
          <p className="text-ink-muted">{t('profile.demoNotice')}</p>
          <ButtonLink to="/auth/sign-in" variant="outline" size="sm">
            {t('profile.signInCta')}
          </ButtonLink>
        </div>
      ) : null}

      <Card>
        <CardHeader
          title={profile?.displayName ?? t('common.loading')}
          description={user?.email ?? profile?.email}
          icon={<UserRound />}
          action={
            profile ? (
              <Badge tone={profile.plan === 'premium' ? 'accent' : 'primary'}>
                {profile.plan === 'premium' ? t('common.premiumPlan') : t('common.freePlan')}
              </Badge>
            ) : null
          }
        />

        <CardBody className="pt-5">
          {!profile ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex items-center gap-4 pb-2">
                <Avatar name={profile.displayName} src={profile.avatarUrl} size="lg" />
                <div>
                  <p className="font-display text-base font-semibold text-ink">{profile.displayName}</p>
                  <p className="text-xs text-ink-subtle">{user?.email ?? profile.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('profile.firstName')} htmlFor={`${id}-first`}>
                  <Input
                    id={`${id}-first`}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </Field>

                <Field label={t('profile.displayName')} htmlFor={`${id}-display`}>
                  <Input
                    id={`${id}-display`}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <Field label={t('profile.timezone')} htmlFor={`${id}-tz`}>
                <Input
                  id={`${id}-tz`}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {isSupabaseActive && user ? (
                  <Button
                    type="button"
                    variant="outline"
                    leadingIcon={<LogOut />}
                    onClick={() => void signOut()}
                  >
                    {t('auth.signOut')}
                  </Button>
                ) : (
                  <span />
                )}

                <Button type="submit" loading={updateProfile.isPending}>
                  {updateProfile.isPending ? t('profile.saving') : t('profile.save')}
                </Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
