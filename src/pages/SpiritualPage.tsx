import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BookOpen, Check, MoonStar, Plus, Sparkles } from 'lucide-react';
import {
  AUTHENTIC_AZKAR,
  computeQuranStats,
  DEFAULT_SPIRITUAL_PREFERENCES,
  getPrayerStateForDay,
  PRAYERS,
  type AzkarPeriod,
} from '@/domain/spiritual';
import type { SpiritualPreferences } from '@/domain/types';
import {
  useSpiritualLogs,
  useSpiritualMutations,
  useSpiritualPreferences,
} from '@/features/spiritual/api/useSpiritual';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { toDayKey } from '@/lib/date';
import { usePreferences } from '@/stores/preferences';
import { toast } from '@/stores/toast';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ProgressBar,
  SegmentedControl,
} from '@/components/ui';

export function SpiritualPage() {
  const { t, fmt } = useI18n();
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);
  const setSpiritualEnabled = usePreferences((s) => s.setSpiritualEnabled);

  const prefsQuery = useSpiritualPreferences();
  const logsQuery = useSpiritualLogs();
  const mutations = useSpiritualMutations();

  const prefs = prefsQuery.data ?? DEFAULT_SPIRITUAL_PREFERENCES;
  const [draftPrefs, setDraftPrefs] = useState<SpiritualPreferences>(prefs);
  const [pagesInput, setPagesInput] = useState('2');
  const [surahInput, setSurahInput] = useState('');
  const [azkarPeriod, setAzkarPeriod] = useState<AzkarPeriod>('morning');
  const [customZikr, setCustomZikr] = useState('');

  useEffect(() => {
    setDraftPrefs(prefs);
  }, [prefs]);

  const today = new Date();
  const todayKey = toDayKey(today);
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const quranStats = useMemo(
    () => computeQuranStats(logs, today, prefs.settings.dailyQuranPages),
    [logs, today, prefs.settings.dailyQuranPages],
  );
  const prayerState = useMemo(() => getPrayerStateForDay(logs, todayKey), [logs, todayKey]);

  const completedAzkarIds = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) {
      if (log.activityType === 'azkar' && log.activityDate === todayKey && log.completedAt) {
        const id = log.activityData.zikrId;
        if (typeof id === 'string') set.add(id);
      }
    }
    return set;
  }, [logs, todayKey]);

  const customAzkar = useMemo(
    () =>
      logs.filter(
        (l) => l.activityType === 'azkar' && typeof l.activityData.customText === 'string',
      ),
    [logs],
  );

  if (!spiritualEnabled) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Card className="p-6 sm:p-8">
          <EmptyState
            icon={<MoonStar />}
            title={t('spiritualModule.disabledTitle')}
            description={t('spiritualModule.disabledBody')}
            action={
              <Button
                onClick={() => {
                  setSpiritualEnabled(true);
                  void mutations.updatePreferences.mutateAsync({ ...prefs, enabled: true });
                }}
              >
                {t('spiritualModule.enableButton')}
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const handleLogQuran = (e: FormEvent) => {
    e.preventDefault();
    const pages = Math.max(1, Number(pagesInput) || 1);
    void mutations.logActivity
      .mutateAsync({
        activityType: 'quran',
        activityDate: todayKey,
        activityData: { pages, surah: surahInput.trim() || undefined },
        completed: true,
      })
      .then(() => {
        setSurahInput('');
        toast.success(t('spiritualModule.logged'));
      });
  };

  const handleAddCustomZikr = () => {
    const clean = customZikr.trim();
    if (!clean) return;
    void mutations.logActivity
      .mutateAsync({
        activityType: 'azkar',
        activityDate: todayKey,
        activityData: { customText: clean, period: azkarPeriod },
        completed: true,
      })
      .then(() => {
        setCustomZikr('');
        toast.success(t('spiritualModule.logged'));
      });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('spiritualModule.title')}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t('spiritualModule.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Quran Reading Tracker */}
        <Card className="lg:col-span-6">
          <CardHeader title={t('spiritualModule.quranTitle')} icon={<BookOpen />} />
          <CardBody className="flex flex-col gap-4 pt-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-ink">
                  {t('spiritualModule.quranToday', {
                    pages: fmt.number(quranStats.pagesToday),
                    target: fmt.number(quranStats.dailyTarget),
                  })}
                </span>
                <span className="tabular font-semibold text-primary dark:text-primary-strong">
                  {fmt.percent(
                    quranStats.dailyTarget > 0
                      ? Math.min(1, quranStats.pagesToday / quranStats.dailyTarget)
                      : 0,
                  )}
                </span>
              </div>
              <ProgressBar
                value={quranStats.dailyTarget > 0 ? quranStats.pagesToday / quranStats.dailyTarget : 0}
                label={t('spiritualModule.quranTitle')}
              />
              <div className="mt-2 flex gap-4 text-xs text-ink-subtle">
                <span>{t('spiritualModule.quranWeek', { pages: fmt.number(quranStats.pagesWeek) })}</span>
                <span>{t('spiritualModule.quranMonth', { pages: fmt.number(quranStats.pagesMonth) })}</span>
              </div>
            </div>

            <form onSubmit={handleLogQuran} className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Field label={t('spiritualModule.pagesRead')} htmlFor="q-pages">
                <Input
                  id="q-pages"
                  type="number"
                  min={1}
                  max={604}
                  value={pagesInput}
                  onChange={(e) => setPagesInput(e.target.value)}
                />
              </Field>
              <Field label={t('spiritualModule.surahLabel')} htmlFor="q-surah">
                <Input
                  id="q-surah"
                  value={surahInput}
                  onChange={(e) => setSurahInput(e.target.value)}
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" className="w-full" loading={mutations.logActivity.isPending}>
                  {t('spiritualModule.logQuran')}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Prayer Checklist & Preferences */}
        <Card className="lg:col-span-6">
          <CardHeader title={t('spiritualModule.prayerTitle')} icon={<MoonStar />} />
          <CardBody className="flex flex-col gap-4 pt-4">
            <div className="grid grid-cols-5 gap-2">
              {PRAYERS.map((prayer) => {
                const done = prayerState[prayer];
                return (
                  <button
                    key={prayer}
                    type="button"
                    aria-pressed={done}
                    onClick={() =>
                      void mutations.logActivity.mutateAsync({
                        activityType: 'prayer',
                        activityDate: todayKey,
                        activityData: { prayer, completed: !done },
                        completed: !done,
                      })
                    }
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-medium transition-colors',
                      done
                        ? 'border-primary bg-primary-soft text-primary dark:text-primary-strong'
                        : 'border-line bg-surface-2 text-ink-muted hover:text-ink',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-5 place-items-center rounded-full border',
                        done ? 'border-primary bg-primary text-primary-fg' : 'border-line-strong text-transparent',
                      )}
                    >
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                    <span>{t(`spiritualModule.prayers.${prayer}`)}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-ink-subtle">{t('spiritualModule.prayerMethodNote')}</p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Field label={t('spiritualModule.prayerMethodLabel')} htmlFor="sp-method">
                <Input
                  id="sp-method"
                  value={draftPrefs.settings.prayerMethod}
                  onChange={(e) =>
                    setDraftPrefs({
                      ...draftPrefs,
                      settings: { ...draftPrefs.settings, prayerMethod: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label={t('spiritualModule.locationLabel')} htmlFor="sp-loc">
                <Input
                  id="sp-loc"
                  value={draftPrefs.settings.locationLabel}
                  onChange={(e) =>
                    setDraftPrefs({
                      ...draftPrefs,
                      settings: { ...draftPrefs.settings, locationLabel: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label={t('spiritualModule.dailyTargetPages')} htmlFor="sp-qtarget">
                <Input
                  id="sp-qtarget"
                  type="number"
                  min={1}
                  max={100}
                  value={draftPrefs.settings.dailyQuranPages}
                  onChange={(e) =>
                    setDraftPrefs({
                      ...draftPrefs,
                      settings: {
                        ...draftPrefs.settings,
                        dailyQuranPages: Math.max(1, Number(e.target.value) || 4),
                      },
                    })
                  }
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void mutations.updatePreferences
                    .mutateAsync({ ...draftPrefs, enabled: true })
                    .then(() => toast.success(t('spiritualModule.prefsSaved')))
                }
              >
                {t('spiritualModule.savePrefs')}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Authentic Azkar Tracker */}
      <Card>
        <CardHeader
          title={t('spiritualModule.azkarTitle')}
          icon={<Sparkles />}
          action={
            <SegmentedControl<AzkarPeriod>
              label={t('spiritualModule.azkarTitle')}
              value={azkarPeriod}
              onChange={setAzkarPeriod}
              size="sm"
              options={[
                { value: 'morning', label: t('spiritualModule.azkarMorning') },
                { value: 'evening', label: t('spiritualModule.azkarEvening') },
                { value: 'post_prayer', label: t('spiritualModule.azkarPostPrayer') },
              ]}
            />
          }
        />
        <CardBody className="flex flex-col gap-3 pt-4">
          {AUTHENTIC_AZKAR.filter((z) => z.period === azkarPeriod).map((zikr) => {
            const done = completedAzkarIds.has(zikr.id);
            return (
              <div
                key={zikr.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-line/80 bg-surface-2 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p dir="rtl" lang="ar" className="text-base leading-loose text-ink">
                    {zikr.arabic}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="accent">{zikr.reference}</Badge>
                    <span className="tabular text-xs text-ink-subtle">×{fmt.number(zikr.targetCount)}</span>
                  </div>
                </div>
                <Button
                  variant={done ? 'primary' : 'outline'}
                  size="sm"
                  leadingIcon={<Check />}
                  onClick={() =>
                    void mutations.logActivity.mutateAsync({
                      activityType: 'azkar',
                      activityDate: todayKey,
                      activityData: { zikrId: zikr.id, period: zikr.period },
                      completed: true,
                    })
                  }
                >
                  {fmt.number(zikr.targetCount)}
                </Button>
              </div>
            );
          })}

          {customAzkar.length > 0 ? (
            <ul className="flex flex-col gap-2 pt-2">
              {customAzkar.map((item) => (
                <li key={item.id} className="rounded-xl border border-line bg-surface px-3.5 py-2 text-sm text-ink">
                  {String(item.activityData.customText)}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-2 flex items-center gap-2">
            <Input
              value={customZikr}
              onChange={(e) => setCustomZikr(e.target.value)}
              placeholder={t('spiritualModule.customZikrPlaceholder')}
            />
            <Button variant="secondary" leadingIcon={<Plus />} onClick={handleAddCustomZikr}>
              {t('spiritualModule.addCustomZikr')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
