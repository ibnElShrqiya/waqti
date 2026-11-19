import { Keyboard, Languages, MoonStar, Palette } from 'lucide-react';
import { isSupabaseActive } from '@/data';
import { LOCALES, SUPPORTED_LOCALES } from '@/i18n/config';
import { useI18n, type Locale } from '@/i18n';
import { usePreferences, type ThemePreference } from '@/stores/preferences';
import { Card, CardBody, CardHeader, Kbd, SegmentedControl, Switch } from '@/components/ui';

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const theme = usePreferences((s) => s.theme);
  const setTheme = usePreferences((s) => s.setTheme);
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const setSpiritualEnabled = usePreferences((s) => s.setSpiritualEnabled);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader
          title={t('settings.appearance.title')}
          description={t('settings.appearance.description')}
          icon={<Palette />}
        />
        <CardBody className="pt-4">
          <SegmentedControl<ThemePreference>
            label={t('theme.label')}
            value={theme}
            onChange={setTheme}
            className="w-full sm:w-auto"
            options={[
              { value: 'light', label: t('theme.light') },
              { value: 'dark', label: t('theme.dark') },
              { value: 'system', label: t('theme.system') },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('settings.language.title')}
          description={t('settings.language.description')}
          icon={<Languages />}
        />
        <CardBody className="pt-4">
          <SegmentedControl<Locale>
            label={t('topbar.switchLanguage')}
            value={locale}
            onChange={setLocale}
            className="w-full sm:w-auto"
            options={SUPPORTED_LOCALES.map((code) => ({
              value: code,
              label: LOCALES[code].nativeName,
            }))}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t('settings.spiritual.title')}
          description={t('settings.spiritual.description')}
          icon={<MoonStar />}
          action={
            <Switch
              checked={spiritualEnabled}
              onChange={setSpiritualEnabled}
              label={t('settings.spiritual.toggle')}
            />
          }
        />
        <CardBody className="pt-3" />
      </Card>

      <Card>
        <CardHeader title={t('settings.shortcuts.title')} icon={<Keyboard />} />
        <CardBody className="pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">{t('settings.shortcuts.newTask')}</span>
            <Kbd>N</Kbd>
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-ink-subtle">
        {isSupabaseActive ? t('settings.syncedNote') : t('settings.localNote')}
      </p>
    </div>
  );
}
