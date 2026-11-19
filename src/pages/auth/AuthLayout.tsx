import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Languages, Moon, Sun } from 'lucide-react';
import { useResolvedTheme } from '@/app/DocumentSync';
import { useI18n } from '@/i18n';
import { usePreferences } from '@/stores/preferences';
import { Logo } from '@/components/layout/Logo';
import { Button, ButtonLink, Card } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t, locale, setLocale } = useI18n();
  const { isSupabaseActive } = useAuth();
  const resolvedTheme = useResolvedTheme();
  const setTheme = usePreferences((s) => s.setTheme);

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
  const nextLocale = locale === 'ar' ? 'en' : 'ar';

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="rounded-xl">
          <Logo name={t('app.name')} />
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(nextLocale)}
            aria-label={t('topbar.switchLanguage')}
            lang={nextLocale}
          >
            <Languages />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(nextTheme)}
            aria-label={t('theme.toggle', { mode: t(`theme.${nextTheme}`) })}
          >
            {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4">
        <div className="w-full max-w-md">
          {!isSupabaseActive ? (
            <div className="mb-4 rounded-2xl border border-accent/40 bg-accent-soft/60 p-4 text-xs text-ink">
              <p className="font-semibold text-accent-strong">{t('auth.notConfiguredTitle')}</p>
              <p className="mt-1 leading-relaxed text-ink-muted">{t('auth.notConfiguredHint')}</p>
              <ButtonLink to="/" variant="outline" size="sm" className="mt-3">
                {t('auth.continueDemo')}
              </ButtonLink>
            </div>
          ) : null}

          <Card className="p-6 sm:p-8">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">{title}</h1>
            <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </Card>

          <p className="mt-6 text-center text-xs text-ink-subtle">{t('app.slogan')}</p>
        </div>
      </main>
    </div>
  );
}
