import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Square,
  Timer,
  Volume2,
} from 'lucide-react';
import {
  computeFocusAnalytics,
  computeRemainingMs,
  createInitialTimerState,
  DEFAULT_FOCUS_PREFERENCES,
  getNextFocusPhase,
  getPhaseDurationMinutes,
  pauseTimer,
  startOrResumeTimer,
  type FocusTimerState,
} from '@/domain/focus';
import type { AmbientSoundKind, FocusPreferences, FocusSessionType } from '@/domain/types';
import { useFocusMutations, useFocusPreferences, useFocusSessions } from '@/features/focus/api/useFocus';
import { AmbientSoundPlayer } from '@/features/focus/lib/ambientAudio';
import { useTasksList } from '@/features/tasks/api/useTasks';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
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
  ProgressRing,
  Switch,
  Textarea,
} from '@/components/ui';

const TIMER_STORAGE_KEY = 'waqti.focus.timer';

function loadSavedTimer(prefs: FocusPreferences): FocusTimerState {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return createInitialTimerState(prefs);
    const parsed = JSON.parse(raw) as FocusTimerState;
    if (typeof parsed.durationMs === 'number' && typeof parsed.phase === 'string') {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return createInitialTimerState(prefs);
}

function formatClock(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function FocusPage() {
  const { t, fmt } = useI18n();
  const prefsQuery = useFocusPreferences();
  const sessionsQuery = useFocusSessions();
  const tasksQuery = useTasksList();
  const mutations = useFocusMutations();

  const prefs = prefsQuery.data ?? DEFAULT_FOCUS_PREFERENCES;
  const [timer, setTimer] = useState<FocusTimerState>(() => loadSavedTimer(prefs));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [notes, setNotes] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draftPrefs, setDraftPrefs] = useState<FocusPreferences>(prefs);

  const audioRef = useRef<AmbientSoundPlayer | null>(null);
  const completedLockRef = useRef(false);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  const { mutateAsync: saveFocusSession } = mutations.createSession;

  useEffect(() => {
    setDraftPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
    } catch {
      // ignore storage quota errors
    }
  }, [timer]);

  // Cleanup audio on unmount
  useEffect(() => {
    const player = new AmbientSoundPlayer();
    audioRef.current = player;
    return () => player.stop();
  }, []);

  const handlePhaseComplete = useCallback(
    async (finalState: FocusTimerState, status: 'completed' | 'abandoned') => {
      if (completedLockRef.current) return;
      completedLockRef.current = true;

      const endMs = Date.now();
      const remaining = computeRemainingMs(finalState, endMs);
      const elapsedSec = Math.max(
        1,
        Math.round((finalState.durationMs - (status === 'completed' ? 0 : remaining)) / 1000),
      );

      if (finalState.startedAtMs) {
        try {
          await saveFocusSession({
            taskId: finalState.taskId || undefined,
            startedAt: new Date(finalState.startedAtMs).toISOString(),
            endedAt: new Date(endMs).toISOString(),
            durationSeconds: elapsedSec,
            sessionType: finalState.phase,
            status,
            notes: notes.trim() || undefined,
            distractionCount: finalState.distractions,
          });
          toast.success(t('focusModule.sessionSaved'));
        } catch {
          // keep timer responsive even if offline
        }
      }

      const { nextPhase, nextCycleCount } =
        status === 'completed'
          ? getNextFocusPhase(finalState.phase, finalState.completedCycleCount, prefs)
          : { nextPhase: 'focus' as FocusSessionType, nextCycleCount: finalState.completedCycleCount };

      const nextDurationMs = getPhaseDurationMinutes(nextPhase, prefs) * 60_000;
      const shouldAutoStart =
        status === 'completed' &&
        ((nextPhase !== 'focus' && prefs.autoStartBreaks) || (nextPhase === 'focus' && prefs.autoStartFocus));

      setNotes('');
      setTimer({
        phase: nextPhase,
        status: shouldAutoStart ? 'running' : 'idle',
        durationMs: nextDurationMs,
        startedAtMs: shouldAutoStart ? endMs : null,
        targetEndMs: shouldAutoStart ? endMs + nextDurationMs : null,
        pausedRemainingMs: nextDurationMs,
        completedCycleCount: nextCycleCount,
        taskId: finalState.taskId,
        distractions: 0,
      });

      if (!shouldAutoStart) {
        audioRef.current?.stop();
      }
      completedLockRef.current = false;
    },
    [saveFocusSession, notes, prefs, t],
  );

  const completeRef = useRef(handlePhaseComplete);
  completeRef.current = handlePhaseComplete;

  // Tick every 250ms and also re-sync immediately when visibility changes (suspension recovery)
  useEffect(() => {
    if (timer.status !== 'running') return;

    const tick = () => {
      const current = Date.now();
      const latest = timerRef.current;
      setNowMs(current);
      if (computeRemainingMs(latest, current) <= 0) {
        void completeRef.current(latest, 'completed');
      }
    };

    const interval = window.setInterval(tick, 250);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [timer.status]);

  const remainingMs = computeRemainingMs(timer, nowMs);
  const progressRatio = timer.durationMs > 0 ? 1 - remainingMs / timer.durationMs : 0;

  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data]);
  const tasks = useMemo(() => (tasksQuery.data ?? []).filter((tk) => tk.status !== 'completed'), [tasksQuery.data]);
  const analytics = useMemo(() => computeFocusAnalytics(sessions, new Date()), [sessions]);

  const selectPhase = (phase: FocusSessionType) => {
    audioRef.current?.stop();
    const durationMs = getPhaseDurationMinutes(phase, prefs) * 60_000;
    setTimer((prev) => ({
      ...prev,
      phase,
      status: 'idle',
      durationMs,
      startedAtMs: null,
      targetEndMs: null,
      pausedRemainingMs: durationMs,
      distractions: 0,
    }));
  };

  const toggleAmbientSound = (sound: AmbientSoundKind) => {
    const next = { ...draftPrefs, ambientSound: sound };
    setDraftPrefs(next);
    void mutations.updatePreferences.mutateAsync(next);
    if (sound === 'none') {
      audioRef.current?.stop();
    } else if (timer.status === 'running') {
      audioRef.current?.start(sound);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen may be blocked in non-interactive or embedded contexts
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">{t('focusModule.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('focusModule.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Settings2 />}
            onClick={() => setShowSettings((v) => !v)}
          >
            {t('focusModule.settingsTitle')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            leadingIcon={isFullscreen ? <Minimize2 /> : <Maximize2 />}
            onClick={() => void toggleFullscreen()}
          >
            {isFullscreen ? t('focusModule.exitFullscreen') : t('focusModule.fullscreen')}
          </Button>
        </div>
      </div>

      {/* Main Immersive Focus Card */}
      <Card className="bg-hero p-6 text-hero-fg sm:p-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {(['focus', 'short_break', 'long_break'] as FocusSessionType[]).map((ph) => {
              const active = timer.phase === ph;
              const label =
                ph === 'focus'
                  ? t('focusModule.phaseFocus')
                  : ph === 'short_break'
                    ? t('focusModule.phaseShortBreak')
                    : t('focusModule.phaseLongBreak');
              return (
                <button
                  key={ph}
                  type="button"
                  disabled={timer.status === 'running'}
                  onClick={() => selectPhase(ph)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60',
                    active ? 'bg-accent text-accent-fg' : 'bg-white/10 text-hero-muted hover:text-hero-fg',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <ProgressRing
            value={progressRatio}
            size={236}
            stroke={11}
            trackClassName="stroke-hero-line/15"
            indicatorClassName="stroke-accent"
            label={t('focusModule.title')}
          >
            <div className="flex flex-col items-center">
              <span className="tabular font-display text-5xl font-bold tracking-tight text-hero-fg sm:text-6xl">
                {formatClock(remainingMs)}
              </span>
              <span className="mt-1 text-xs font-medium text-hero-muted">
                {timer.phase === 'focus'
                  ? t('focusModule.phaseFocus')
                  : timer.phase === 'short_break'
                    ? t('focusModule.phaseShortBreak')
                    : t('focusModule.phaseLongBreak')}
              </span>
            </div>
          </ProgressRing>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {timer.status === 'running' ? (
              <Button
                size="lg"
                variant="accent"
                leadingIcon={<Pause />}
                onClick={() => {
                  setTimer((s) => pauseTimer(s, Date.now()));
                  audioRef.current?.stop();
                }}
              >
                {t('focusModule.pause')}
              </Button>
            ) : (
              <Button
                size="lg"
                variant="accent"
                leadingIcon={<Play />}
                onClick={() => {
                  const current = Date.now();
                  setNowMs(current);
                  setTimer((s) => startOrResumeTimer(s, current));
                  if (prefs.ambientSound !== 'none') audioRef.current?.start(prefs.ambientSound);
                }}
              >
                {timer.status === 'paused' ? t('focusModule.resume') : t('focusModule.start')}
              </Button>
            )}

            {timer.status !== 'idle' ? (
              <>
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/10 text-hero-fg hover:bg-white/20"
                  leadingIcon={<CheckCircle2 />}
                  onClick={() => void handlePhaseComplete(timer, 'completed')}
                >
                  {t('focusModule.completeNow')}
                </Button>
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/10 text-hero-fg hover:bg-white/20"
                  leadingIcon={<Square />}
                  onClick={() => void handlePhaseComplete(timer, 'abandoned')}
                >
                  {t('focusModule.stopAbandon')}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="border-white/20 bg-white/10 text-hero-fg hover:bg-white/20"
                leadingIcon={<RotateCcw />}
                onClick={() => selectPhase(timer.phase)}
              >
                {t('focusModule.reset')}
              </Button>
            )}
          </div>

          <div className="grid w-full grid-cols-1 gap-3 text-start sm:grid-cols-2">
            <div>
              <label htmlFor="focus-task-select" className="mb-1 block text-xs text-hero-muted">
                {t('focusModule.linkedTask')}
              </label>
              <select
                id="focus-task-select"
                value={timer.taskId ?? ''}
                onChange={(e) => setTimer((s) => ({ ...s, taskId: e.target.value || undefined }))}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-hero-fg focus:outline-none"
              >
                <option value="" className="text-ink">
                  {t('focusModule.noTask')}
                </option>
                {tasks.map((tk) => (
                  <option key={tk.id} value={tk.id} className="text-ink">
                    {tk.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="focus-sound-select" className="mb-1 flex items-center gap-1.5 text-xs text-hero-muted">
                <Volume2 className="size-3.5" aria-hidden />
                {t('focusModule.ambientSound')}
              </label>
              <select
                id="focus-sound-select"
                value={prefs.ambientSound}
                onChange={(e) => toggleAmbientSound(e.target.value as AmbientSoundKind)}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-hero-fg focus:outline-none"
              >
                <option value="none" className="text-ink">{t('focusModule.soundNone')}</option>
                <option value="rain" className="text-ink">{t('focusModule.soundRain')}</option>
                <option value="brown" className="text-ink">{t('focusModule.soundBrown')}</option>
              </select>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('focusModule.notesPlaceholder')}
              className="min-h-[44px] flex-1 border-white/15 bg-white/10 text-hero-fg placeholder:text-hero-muted"
            />
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-white/10 text-hero-fg hover:bg-white/20"
              onClick={() => setTimer((s) => ({ ...s, distractions: s.distractions + 1 }))}
            >
              {t('focusModule.logDistraction')} ({fmt.number(timer.distractions)})
            </Button>
          </div>

          <p className="text-xs text-hero-muted">{t('focusModule.encouragement')}</p>
        </div>
      </Card>

      {showSettings ? (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink">{t('focusModule.settingsTitle')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label={t('focusModule.focusMinutes')} htmlFor="fp-focus">
              <Input
                id="fp-focus"
                type="number"
                min={1}
                max={180}
                value={draftPrefs.focusDuration}
                onChange={(e) => setDraftPrefs({ ...draftPrefs, focusDuration: Math.max(1, Number(e.target.value) || 25) })}
              />
            </Field>
            <Field label={t('focusModule.shortBreakMinutes')} htmlFor="fp-short">
              <Input
                id="fp-short"
                type="number"
                min={1}
                max={60}
                value={draftPrefs.shortBreakDuration}
                onChange={(e) => setDraftPrefs({ ...draftPrefs, shortBreakDuration: Math.max(1, Number(e.target.value) || 5) })}
              />
            </Field>
            <Field label={t('focusModule.longBreakMinutes')} htmlFor="fp-long">
              <Input
                id="fp-long"
                type="number"
                min={1}
                max={90}
                value={draftPrefs.longBreakDuration}
                onChange={(e) => setDraftPrefs({ ...draftPrefs, longBreakDuration: Math.max(1, Number(e.target.value) || 15) })}
              />
            </Field>
            <Field label={t('focusModule.sessionsBeforeLong')} htmlFor="fp-cycles">
              <Input
                id="fp-cycles"
                type="number"
                min={1}
                max={12}
                value={draftPrefs.sessionsBeforeLongBreak}
                onChange={(e) =>
                  setDraftPrefs({ ...draftPrefs, sessionsBeforeLongBreak: Math.max(1, Number(e.target.value) || 4) })
                }
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                <Switch
                  checked={draftPrefs.autoStartBreaks}
                  onChange={(v) => setDraftPrefs({ ...draftPrefs, autoStartBreaks: v })}
                  label={t('focusModule.autoStartBreaks')}
                />
                <span>{t('focusModule.autoStartBreaks')}</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                <Switch
                  checked={draftPrefs.autoStartFocus}
                  onChange={(v) => setDraftPrefs({ ...draftPrefs, autoStartFocus: v })}
                  label={t('focusModule.autoStartFocus')}
                />
                <span>{t('focusModule.autoStartFocus')}</span>
              </label>
            </div>
            <Button
              onClick={() => {
                void mutations.updatePreferences.mutateAsync(draftPrefs).then(() => {
                  if (timer.status === 'idle') {
                    const nextMs = getPhaseDurationMinutes(timer.phase, draftPrefs) * 60_000;
                    setTimer((s) => ({ ...s, durationMs: nextMs, pausedRemainingMs: nextMs }));
                  }
                  toast.success(t('focusModule.settingsSaved'));
                  setShowSettings(false);
                });
              }}
            >
              {t('focusModule.saveSettings')}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Analytics + History */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('focusModule.todayTime')}</p>
          <p className="tabular mt-1.5 font-display text-xl font-bold text-ink">{fmt.duration(analytics.todayMinutes)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('focusModule.weekTime')}</p>
          <p className="tabular mt-1.5 font-display text-xl font-bold text-ink">{fmt.duration(analytics.weekMinutes)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('focusModule.monthTime')}</p>
          <p className="tabular mt-1.5 font-display text-xl font-bold text-ink">{fmt.duration(analytics.monthMinutes)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('focusModule.completedCount')}</p>
          <p className="tabular mt-1.5 font-display text-xl font-bold text-ink">{fmt.number(analytics.completedSessions)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('focusModule.avgDuration')}</p>
          <p className="tabular mt-1.5 font-display text-xl font-bold text-ink">{fmt.duration(analytics.averageMinutes)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink-muted">{t('focusModule.productiveDay')}</p>
          <p className="tabular mt-1.5 font-display text-sm font-bold text-ink">
            {analytics.mostProductiveDayKey ?? '—'}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('focusModule.historyTitle')} icon={<Timer />} />
        <CardBody className="pt-4">
          {sessions.length === 0 ? (
            <EmptyState icon={<Timer />} title={t('focusModule.emptyHistory')} compact />
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.slice(0, 15).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/70 bg-surface-2 px-3.5 py-2.5 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={s.status === 'completed' ? 'success' : 'neutral'}>
                        {t(
                          s.sessionType === 'focus'
                            ? 'focusModule.phaseFocus'
                            : s.sessionType === 'short_break'
                              ? 'focusModule.phaseShortBreak'
                              : 'focusModule.phaseLongBreak',
                        )}
                      </Badge>
                      <span className="tabular font-medium text-ink">
                        {fmt.duration(Math.round(s.durationSeconds / 60))}
                      </span>
                    </div>
                    {s.notes ? <p className="mt-1 text-xs text-ink-muted">{s.notes}</p> : null}
                  </div>
                  <span className="tabular text-xs text-ink-subtle">
                    {fmt.shortDate(new Date(s.startedAt))} · {fmt.time(new Date(s.startedAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
