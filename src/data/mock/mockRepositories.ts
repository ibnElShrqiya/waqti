/**
 * ⚠️ MOCK BACKEND — Demo fallback when Supabase is not configured.
 * In-memory implementation of the repository contracts. Changes live only for
 * the current page session.
 */
import { PLAN_CATALOG } from '@/domain/entitlements';
import { computeHabitStreaks, isHabitCompletedOn } from '@/domain/habits';
import { computeQuranStats, getPrayerStateForDay } from '@/domain/spiritual';
import { computeNextRecurrenceDates } from '@/domain/tasks';
import type {
  Calendar,
  CalendarEvent,
  DashboardSnapshot,
  Goal,
  Habit,
  HabitSummary,
  NewCalendarEventInput,
  NewGoalInput,
  NewHabitInput,
  NewMilestoneInput,
  NewTaskInput,
  Subtask,
  Task,
  TaskCategory,
  UpdateCalendarEventInput,
  UpdateGoalInput,
  UpdateHabitInput,
  UpdateMilestoneInput,
  UpdateTaskInput,
  UserPreferencesRecord,
  UserProfile,
} from '@/domain/types';
import type { Locale } from '@/i18n/types';
import { addDays, toDayKey } from '@/lib/date';
import { usePreferences } from '@/stores/preferences';
import type { Repositories } from '../repositories/types';
import {
  seedMockState,
  type MaybeLocalized,
  type MockCategory,
  type MockEvent,
  type MockGoal,
  type MockHabit,
  type MockState,
  type MockTask,
} from './seed';

export interface MockBackendOptions {
  getLocale: () => Locale;
  latencyMs?: number;
  now?: () => Date;
}

export function createMockRepositories({
  getLocale,
  latencyMs = 150,
  now = () => new Date(),
}: MockBackendOptions): Repositories {
  let state: MockState | null = null;
  let localCounter = 100;

  const ensureState = (day: Date): MockState => {
    if (!state || state.dayKey !== toDayKey(day)) state = seedMockState(day);
    return state;
  };

  const delay = <T>(value: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), latencyMs));

  const text = (value: MaybeLocalized): string =>
    typeof value === 'string' ? value : value[getLocale()];

  const optText = (value?: MaybeLocalized): string | undefined =>
    value === undefined ? undefined : text(value);

  const toTask = (t: MockTask): Task => ({ ...t, title: text(t.title) });

  const toCategory = (c: MockCategory): TaskCategory => ({
    id: c.id,
    name: text(c.name),
    color: c.color,
  });

  const toEvent = (e: MockEvent): CalendarEvent => ({
    ...e,
    title: text(e.title),
    description: optText(e.description),
    location: optText(e.location),
  });

  const toHabit = (h: MockHabit): Habit => ({
    id: h.id,
    name: text(h.name),
    description: optText(h.description),
    icon: h.icon,
    color: h.color,
    category: h.category,
    frequencyType: h.frequencyType,
    frequencyConfig: h.frequencyConfig,
    targetCount: h.targetCount,
    reminderTime: h.reminderTime,
    startDate: h.startDate,
    endDate: h.endDate,
    isArchived: h.isArchived,
    spiritual: h.spiritual,
    createdAt: now().toISOString(),
    updatedAt: now().toISOString(),
  });

  const toHabitSummary = (h: MockHabit, s: MockState, today: Date): HabitSummary => {
    const habit = toHabit(h);
    const todayKey = toDayKey(today);
    const logsByDate = new Map(
      s.habitLogs.filter((l) => l.habitId === h.id).map((l) => [l.logDate, l]),
    );
    const streaks = computeHabitStreaks(habit, s.habitLogs, todayKey);
    return {
      id: h.id,
      name: habit.name,
      icon: h.icon,
      completedToday: isHabitCompletedOn(habit, logsByDate, todayKey),
      streak: streaks.current,
      lastSevenDays: Array.from({ length: 7 }, (_, i) =>
        isHabitCompletedOn(habit, logsByDate, toDayKey(addDays(today, i - 6))),
      ),
      spiritual: h.spiritual,
    };
  };

  const toGoal = (g: MockGoal): Goal => ({
    ...g,
    title: text(g.title),
    description: optText(g.description),
    milestones: [...g.milestones].sort((a, b) => a.sortOrder - b.sortOrder),
  });

  const findTask = (id: string): MockTask => {
    const found = ensureState(now()).tasks.find((t) => t.id === id);
    if (!found) throw new Error(`Task ${id} not found`);
    return found;
  };

  const buildProfile = (s: MockState): UserProfile => ({
    id: 'demo-user',
    firstName: text(s.firstName),
    displayName: text(s.displayName),
    plan: s.subscription.planId === 'pro' ? 'premium' : 'free',
    role: 'admin',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    email: 'demo@waqti.app',
  });

  return {
    source: 'mock',

    dashboard: {
      async getSnapshot(day) {
        const s = ensureState(day);
        const current = now();
        const eventEntries = s.events
          .filter((ev) => !ev.taskId)
          .map((ev) => ({
            id: ev.id,
            kind: 'event' as const,
            title: text(ev.title),
            startAt: ev.startAt,
            endAt: ev.endAt,
            done: new Date(ev.endAt).getTime() <= current.getTime(),
          }));

        const staticEntries = s.entries
          .filter((e) => e.kind !== 'event')
          .map((e) => ({
            id: e.id,
            kind: e.kind,
            title: text(e.title),
            startAt: e.startAt,
            endAt: e.endAt,
            spiritual: e.spiritual,
            done: new Date(e.endAt ?? e.startAt).getTime() <= current.getTime(),
          }));

        const todayKey = toDayKey(current);
        const quranStats = computeQuranStats(
          s.spiritualLogs,
          current,
          s.spiritualPreferences.settings.dailyQuranPages,
        );
        const prayerState = getPrayerStateForDay(s.spiritualLogs, todayKey);
        const prayersCompletedToday = Object.values(prayerState).filter(Boolean).length;
        const azkarCompletedToday = s.spiritualLogs.filter(
          (l) => l.activityDate === todayKey && l.activityType === 'azkar' && l.completedAt,
        ).length;

        const snapshot: DashboardSnapshot = {
          source: 'mock',
          generatedAt: current.toISOString(),
          profile: buildProfile(s),
          tasks: s.tasks.map(toTask),
          schedule: [...staticEntries, ...eventEntries],
          habits: s.habits.filter((h) => !h.isArchived).map((h) => toHabitSummary(h, s, current)),
          goals: s.goals.filter((g) => g.status === 'active').map(toGoal),
          focus: s.focus,
          insights: s.insights.map((i) => ({
            id: i.id,
            kind: i.kind,
            title: text(i.title),
            body: text(i.body),
          })),
          notifications: s.notifications.filter((n) => n.status !== 'dismissed'),
          spiritualSummary: s.spiritualPreferences.enabled
            ? {
                quranPagesToday: quranStats.pagesToday,
                quranDailyTarget: quranStats.dailyTarget,
                prayersCompletedToday,
                azkarCompletedToday,
              }
            : undefined,
        };
        return delay(snapshot);
      },
    },

    tasks: {
      async list() {
        const s = ensureState(now());
        return delay(s.tasks.map(toTask));
      },

      async create(input: NewTaskInput) {
        const s = ensureState(now());
        const timestamp = now().toISOString();
        const endAt =
          input.endAt ??
          (input.startAt && input.estimatedMinutes
            ? new Date(new Date(input.startAt).getTime() + input.estimatedMinutes * 60_000).toISOString()
            : undefined);
        const created: MockTask = {
          id: `local-${++localCounter}`,
          title: input.title.trim(),
          notes: input.notes?.trim() || undefined,
          priority: input.priority,
          status: input.status ?? 'todo',
          categoryId: input.categoryId,
          tags: input.tags ?? [],
          startAt: input.startAt,
          endAt,
          dueAt: input.dueAt,
          estimatedMinutes: input.estimatedMinutes,
          recurrence: input.recurrence,
          subtasks: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        s.tasks.unshift(created);
        return delay(toTask(created));
      },

      async update(id: string, patch: UpdateTaskInput) {
        const t = findTask(id);
        const timestamp = now().toISOString();
        if (patch.title !== undefined) t.title = patch.title.trim();
        if (patch.notes !== undefined) t.notes = patch.notes?.trim() || undefined;
        if (patch.status !== undefined) {
          t.status = patch.status;
          t.completedAt = patch.status === 'completed' ? timestamp : undefined;
        }
        if (patch.priority !== undefined) t.priority = patch.priority;
        if (patch.categoryId !== undefined) t.categoryId = patch.categoryId ?? undefined;
        if (patch.tags !== undefined) t.tags = patch.tags;
        if (patch.startAt !== undefined) t.startAt = patch.startAt ?? undefined;
        if (patch.endAt !== undefined) t.endAt = patch.endAt ?? undefined;
        if (patch.dueAt !== undefined) t.dueAt = patch.dueAt ?? undefined;
        if (patch.estimatedMinutes !== undefined) t.estimatedMinutes = patch.estimatedMinutes ?? undefined;
        if (patch.recurrence !== undefined) t.recurrence = patch.recurrence ?? undefined;
        t.updatedAt = timestamp;
        return delay(toTask(t));
      },

      async delete(id: string) {
        const s = ensureState(now());
        s.tasks = s.tasks.filter((t) => t.id !== id);
        return delay(undefined);
      },

      async setCompleted(id, completed) {
        const s = ensureState(now());
        const t = findTask(id);
        const timestamp = now().toISOString();
        t.status = completed ? 'completed' : 'todo';
        t.completedAt = completed ? timestamp : undefined;
        t.updatedAt = timestamp;

        if (completed && t.recurrence) {
          const nextDates = computeNextRecurrenceDates(toTask(t), now());
          if (nextDates) {
            s.tasks.unshift({
              ...structuredClone(t),
              id: `local-${++localCounter}`,
              status: 'todo',
              completedAt: undefined,
              startAt: nextDates.startAt,
              endAt: nextDates.endAt,
              dueAt: nextDates.dueAt,
              subtasks: t.subtasks?.map((st) => ({ ...st, id: `st-${++localCounter}`, completed: false })),
              createdAt: timestamp,
              updatedAt: timestamp,
            });
          }
        }

        return delay(toTask(t));
      },

      async addSubtask(taskId: string, title: string) {
        const t = findTask(taskId);
        const list = (t.subtasks ??= []);
        const sub: Subtask = {
          id: `st-${++localCounter}`,
          taskId,
          title: title.trim(),
          completed: false,
          position: list.length,
          createdAt: now().toISOString(),
        };
        list.push(sub);
        return delay(sub);
      },

      async toggleSubtask(subtaskId: string, completed: boolean) {
        const s = ensureState(now());
        for (const t of s.tasks) {
          const sub = t.subtasks?.find((x) => x.id === subtaskId);
          if (sub) {
            sub.completed = completed;
            return delay(sub);
          }
        }
        throw new Error(`Subtask ${subtaskId} not found`);
      },

      async deleteSubtask(subtaskId: string) {
        const s = ensureState(now());
        for (const t of s.tasks) {
          if (t.subtasks) {
            t.subtasks = t.subtasks.filter((x) => x.id !== subtaskId);
          }
        }
        return delay(undefined);
      },
    },

    categories: {
      async list() {
        return delay(ensureState(now()).categories.map(toCategory));
      },

      async create(name: string, color: string) {
        const s = ensureState(now());
        const cat: MockCategory = { id: `cat-${++localCounter}`, name: name.trim(), color };
        s.categories.push(cat);
        return delay(toCategory(cat));
      },

      async delete(id: string) {
        const s = ensureState(now());
        s.categories = s.categories.filter((c) => c.id !== id);
        return delay(undefined);
      },
    },

    calendar: {
      async listCalendars() {
        return delay(ensureState(now()).calendars);
      },

      async createCalendar(name: string, color: string) {
        const s = ensureState(now());
        const cal: Calendar = {
          id: `cal-${++localCounter}`,
          name: name.trim(),
          color,
          isDefault: false,
        };
        s.calendars.push(cal);
        return delay(cal);
      },

      async listEvents() {
        return delay(ensureState(now()).events.map(toEvent));
      },

      async createEvent(input: NewCalendarEventInput) {
        const s = ensureState(now());
        const ts = now().toISOString();
        const ev: MockEvent = {
          id: `ev-${++localCounter}`,
          calendarId: input.calendarId,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          location: input.location?.trim() || undefined,
          startAt: input.startAt,
          endAt: input.endAt,
          allDay: input.allDay ?? false,
          timezone: input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          color: input.color ?? '#2D699B',
          taskId: input.taskId,
          createdAt: ts,
          updatedAt: ts,
        };
        s.events.push(ev);
        return delay(toEvent(ev));
      },

      async updateEvent(id: string, patch: UpdateCalendarEventInput) {
        const s = ensureState(now());
        const ev = s.events.find((x) => x.id === id);
        if (!ev) throw new Error(`Event ${id} not found`);
        if (patch.calendarId !== undefined) ev.calendarId = patch.calendarId ?? undefined;
        if (patch.title !== undefined) ev.title = patch.title.trim();
        if (patch.description !== undefined) ev.description = patch.description?.trim() || undefined;
        if (patch.location !== undefined) ev.location = patch.location?.trim() || undefined;
        if (patch.startAt !== undefined) ev.startAt = patch.startAt;
        if (patch.endAt !== undefined) ev.endAt = patch.endAt;
        if (patch.allDay !== undefined) ev.allDay = patch.allDay;
        if (patch.timezone !== undefined) ev.timezone = patch.timezone;
        if (patch.color !== undefined) ev.color = patch.color;
        if (patch.taskId !== undefined) ev.taskId = patch.taskId ?? undefined;
        ev.updatedAt = now().toISOString();
        return delay(toEvent(ev));
      },

      async deleteEvent(id: string) {
        const s = ensureState(now());
        s.events = s.events.filter((x) => x.id !== id);
        return delay(undefined);
      },
    },

    habits: {
      async list() {
        return delay(ensureState(now()).habits.map(toHabit));
      },

      async listLogs(fromDate?: string, toDate?: string) {
        const logs = ensureState(now()).habitLogs.filter((l) => {
          if (fromDate && l.logDate < fromDate) return false;
          if (toDate && l.logDate > toDate) return false;
          return true;
        });
        return delay(logs);
      },

      async create(input: NewHabitInput) {
        const s = ensureState(now());
        const created: MockHabit = {
          id: `h-${++localCounter}`,
          name: input.name.trim(),
          description: input.description?.trim() || undefined,
          icon: input.icon,
          color: input.color,
          category: input.category,
          frequencyType: input.frequencyType,
          frequencyConfig: input.frequencyConfig,
          targetCount: Math.max(1, input.targetCount),
          reminderTime: input.reminderTime,
          startDate: input.startDate,
          endDate: input.endDate,
          isArchived: false,
          baseStreak: 0,
          history: [false, false, false, false, false, false],
          completedToday: false,
        };
        s.habits.push(created);
        return delay(toHabit(created));
      },

      async update(id: string, patch: UpdateHabitInput) {
        const s = ensureState(now());
        const h = s.habits.find((x) => x.id === id);
        if (!h) throw new Error(`Habit ${id} not found`);
        if (patch.name !== undefined) h.name = patch.name.trim();
        if (patch.description !== undefined) h.description = patch.description?.trim() || undefined;
        if (patch.icon !== undefined) h.icon = patch.icon;
        if (patch.color !== undefined) h.color = patch.color;
        if (patch.category !== undefined) h.category = patch.category;
        if (patch.frequencyType !== undefined) h.frequencyType = patch.frequencyType;
        if (patch.frequencyConfig !== undefined) h.frequencyConfig = patch.frequencyConfig;
        if (patch.targetCount !== undefined) h.targetCount = Math.max(1, patch.targetCount);
        if (patch.reminderTime !== undefined) h.reminderTime = patch.reminderTime ?? undefined;
        if (patch.startDate !== undefined) h.startDate = patch.startDate;
        if (patch.endDate !== undefined) h.endDate = patch.endDate ?? undefined;
        if (patch.isArchived !== undefined) h.isArchived = patch.isArchived;
        return delay(toHabit(h));
      },

      async delete(id: string) {
        const s = ensureState(now());
        s.habits = s.habits.filter((x) => x.id !== id);
        s.habitLogs = s.habitLogs.filter((l) => l.habitId !== id);
        return delay(undefined);
      },

      async logProgress(habitId: string, logDate: string, completedCount: number, notes?: string) {
        const s = ensureState(now());
        const existing = s.habitLogs.find((l) => l.habitId === habitId && l.logDate === logDate);
        if (existing) {
          existing.completedCount = Math.max(0, completedCount);
          existing.notes = notes?.trim() || undefined;
          existing.completedAt = completedCount > 0 ? now().toISOString() : undefined;
          return delay(existing);
        }
        const created = {
          id: `hl-${++localCounter}`,
          habitId,
          logDate,
          completedCount: Math.max(0, completedCount),
          notes: notes?.trim() || undefined,
          completedAt: completedCount > 0 ? now().toISOString() : undefined,
        };
        s.habitLogs.push(created);
        return delay(created);
      },

      async setDoneToday(id, done) {
        const s = ensureState(now());
        const h = s.habits.find((x) => x.id === id);
        if (!h) throw new Error(`Habit ${id} not found`);
        const todayKey = toDayKey(now());
        const existing = s.habitLogs.find((l) => l.habitId === id && l.logDate === todayKey);
        const nextCount = done ? h.targetCount : 0;
        if (existing) {
          existing.completedCount = nextCount;
          existing.completedAt = done ? now().toISOString() : undefined;
        } else {
          s.habitLogs.push({
            id: `hl-${++localCounter}`,
            habitId: id,
            logDate: todayKey,
            completedCount: nextCount,
            completedAt: done ? now().toISOString() : undefined,
          });
        }
        h.completedToday = done;
        return delay(toHabitSummary(h, s, now()));
      },
    },

    goals: {
      async list() {
        return delay(ensureState(now()).goals.map(toGoal));
      },

      async create(input: NewGoalInput) {
        const s = ensureState(now());
        const ts = now().toISOString();
        const created: MockGoal = {
          id: `g-${++localCounter}`,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          category: input.category,
          icon: input.icon ?? 'flag',
          color: input.color ?? '#176B56',
          startDate: input.startDate,
          targetDate: input.targetDate,
          priority: input.priority,
          status: input.status ?? 'active',
          manualProgress: input.manualProgress ?? 0,
          targetValue: input.targetValue,
          currentValue: input.currentValue ?? 0,
          milestones: [],
          createdAt: ts,
          updatedAt: ts,
        };
        s.goals.unshift(created);
        return delay(toGoal(created));
      },

      async update(id: string, patch: UpdateGoalInput) {
        const s = ensureState(now());
        const g = s.goals.find((x) => x.id === id);
        if (!g) throw new Error(`Goal ${id} not found`);
        if (patch.title !== undefined) g.title = patch.title.trim();
        if (patch.description !== undefined) g.description = patch.description?.trim() || undefined;
        if (patch.category !== undefined) g.category = patch.category;
        if (patch.icon !== undefined) g.icon = patch.icon;
        if (patch.color !== undefined) g.color = patch.color;
        if (patch.startDate !== undefined) g.startDate = patch.startDate;
        if (patch.targetDate !== undefined) g.targetDate = patch.targetDate ?? undefined;
        if (patch.priority !== undefined) g.priority = patch.priority;
        if (patch.status !== undefined) g.status = patch.status;
        if (patch.manualProgress !== undefined) g.manualProgress = patch.manualProgress;
        if (patch.targetValue !== undefined) g.targetValue = patch.targetValue ?? undefined;
        if (patch.currentValue !== undefined) g.currentValue = patch.currentValue;
        g.updatedAt = now().toISOString();
        return delay(toGoal(g));
      },

      async delete(id: string) {
        const s = ensureState(now());
        s.goals = s.goals.filter((x) => x.id !== id);
        return delay(undefined);
      },

      async addMilestone(input: NewMilestoneInput) {
        const s = ensureState(now());
        const g = s.goals.find((x) => x.id === input.goalId);
        if (!g) throw new Error(`Goal ${input.goalId} not found`);
        const milestone = {
          id: `gm-${++localCounter}`,
          goalId: input.goalId,
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          targetDate: input.targetDate,
          isCompleted: false,
          sortOrder: g.milestones.length,
        };
        g.milestones.push(milestone);
        return delay(milestone);
      },

      async updateMilestone(id: string, patch: UpdateMilestoneInput) {
        const s = ensureState(now());
        for (const g of s.goals) {
          const m = g.milestones.find((x) => x.id === id);
          if (m) {
            if (patch.title !== undefined) m.title = patch.title.trim();
            if (patch.description !== undefined) m.description = patch.description?.trim() || undefined;
            if (patch.targetDate !== undefined) m.targetDate = patch.targetDate ?? undefined;
            if (patch.isCompleted !== undefined) {
              m.isCompleted = patch.isCompleted;
              m.completedAt = patch.isCompleted ? now().toISOString() : undefined;
            }
            if (patch.sortOrder !== undefined) m.sortOrder = patch.sortOrder;
            return delay(m);
          }
        }
        throw new Error(`Milestone ${id} not found`);
      },

      async deleteMilestone(id: string) {
        const s = ensureState(now());
        for (const g of s.goals) {
          g.milestones = g.milestones.filter((x) => x.id !== id);
        }
        return delay(undefined);
      },

      async reorderMilestones(goalId: string, orderedIds: string[]) {
        const s = ensureState(now());
        const g = s.goals.find((x) => x.id === goalId);
        if (!g) return delay(undefined);
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        for (const m of g.milestones) {
          const next = orderMap.get(m.id);
          if (next !== undefined) m.sortOrder = next;
        }
        g.milestones.sort((a, b) => a.sortOrder - b.sortOrder);
        return delay(undefined);
      },
    },

    profile: {
      async get() {
        return delay(buildProfile(ensureState(now())));
      },

      async update(patch) {
        const s = ensureState(now());
        if (patch.firstName !== undefined) s.firstName = { en: patch.firstName, ar: patch.firstName };
        if (patch.displayName !== undefined) s.displayName = { en: patch.displayName, ar: patch.displayName };
        return delay(buildProfile(s));
      },
    },

    preferences: {
      async get(): Promise<UserPreferencesRecord> {
        const p = usePreferences.getState();
        return delay({
          theme: p.theme,
          locale: p.locale,
          sidebarCollapsed: p.sidebarCollapsed,
          spiritualEnabled: p.spiritualEnabled,
        });
      },

      async upsert(prefs: UserPreferencesRecord): Promise<UserPreferencesRecord> {
        return delay(prefs);
      },
    },

    focus: {
      async getPreferences() {
        return delay(ensureState(now()).focusPreferences);
      },
      async updatePreferences(prefs) {
        ensureState(now()).focusPreferences = prefs;
        return delay(prefs);
      },
      async listSessions() {
        return delay(ensureState(now()).focusSessions);
      },
      async createSession(input) {
        const s = ensureState(now());
        const session = {
          id: `fs-${++localCounter}`,
          taskId: input.taskId,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          durationSeconds: input.durationSeconds,
          sessionType: input.sessionType,
          status: input.status,
          notes: input.notes,
          distractionCount: input.distractionCount ?? 0,
          createdAt: now().toISOString(),
        };
        s.focusSessions.unshift(session);
        if (input.sessionType === 'focus' && input.status === 'completed') {
          const mins = Math.round(input.durationSeconds / 60);
          s.focus.todayMinutes += mins;
          s.focus.sessionsToday += 1;
          const lastWeekDay = s.focus.week[s.focus.week.length - 1];
          if (lastWeekDay) lastWeekDay.minutes += mins;
        }
        return delay(session);
      },
    },

    ai: {
      async listConversations() {
        return delay([]);
      },
      async listMessages() {
        return delay([]);
      },
      async deleteConversation() {
        return delay(undefined);
      },
      async sendMessage() {
        throw new Error(
          'Rafiq AI requires a live Supabase Edge Function (rafiq-chat) with a server-side AI provider key.',
        );
      },
      async executeAction() {
        throw new Error('Rafiq AI action execution requires a live Supabase connection.');
      },
    },

    spiritual: {
      async getPreferences() {
        return delay(ensureState(now()).spiritualPreferences);
      },
      async updatePreferences(prefs) {
        ensureState(now()).spiritualPreferences = prefs;
        return delay(prefs);
      },
      async listLogs(fromDate?: string, toDate?: string) {
        const logs = ensureState(now()).spiritualLogs.filter((l) => {
          if (fromDate && l.activityDate < fromDate) return false;
          if (toDate && l.activityDate > toDate) return false;
          return true;
        });
        return delay(logs);
      },
      async logActivity({ activityType, activityDate, activityData, completed }) {
        const s = ensureState(now());
        const created = {
          id: `sl-${++localCounter}`,
          activityType,
          activityDate,
          activityData,
          completedAt: completed ? now().toISOString() : undefined,
          createdAt: now().toISOString(),
        };
        s.spiritualLogs.unshift(created);
        return delay(created);
      },
    },

    notifications: {
      async getPreferences() {
        return delay(ensureState(now()).notificationPreferences);
      },
      async updatePreferences(prefs) {
        ensureState(now()).notificationPreferences = prefs;
        return delay(prefs);
      },
      async list() {
        return delay(ensureState(now()).notifications.filter((n) => n.status !== 'dismissed'));
      },
      async markRead(id) {
        const n = ensureState(now()).notifications.find((x) => x.id === id);
        if (n) {
          n.status = 'read';
          n.readAt = now().toISOString();
        }
        return delay(undefined);
      },
      async markAllRead() {
        const ts = now().toISOString();
        for (const n of ensureState(now()).notifications) {
          if (n.status === 'pending' || n.status === 'delivered') {
            n.status = 'read';
            n.readAt = ts;
          }
        }
        return delay(undefined);
      },
      async dismiss(id) {
        const n = ensureState(now()).notifications.find((x) => x.id === id);
        if (n) n.status = 'dismissed';
        return delay(undefined);
      },
      async savePushSubscription() {
        return delay(undefined);
      },
      async removePushSubscription() {
        return delay(undefined);
      },
    },

    subscriptions: {
      async listPlans() {
        return delay(Object.values(PLAN_CATALOG));
      },
      async getCurrent() {
        return delay(ensureState(now()).subscription);
      },
      async getUsage() {
        const s = ensureState(now());
        return delay({
          activeHabits: s.habits.filter((h) => !h.isArchived).length,
          activeGoals: s.goals.filter((g) => g.status === 'active').length,
          aiRequestsToday: 0,
        });
      },
      async requestPlanChange(targetPlan) {
        const s = ensureState(now());
        const current = now();
        s.subscription = {
          id: 'sub-demo',
          planId: targetPlan,
          status: 'active',
          provider: 'manual',
          currentPeriodStart: current.toISOString(),
          currentPeriodEnd:
            targetPlan === 'pro' ? new Date(current.getTime() + 30 * 86_400_000).toISOString() : undefined,
          cancelAtPeriodEnd: false,
        };
        const demoUser = s.adminUsers.find((u) => u.id === 'demo-user');
        if (demoUser) demoUser.plan = targetPlan;
        return delay({
          ok: true,
          message: `Demo mode: switched to ${targetPlan.toUpperCase()} plan locally.`,
        });
      },
      async cancelAtPeriodEnd() {
        const s = ensureState(now());
        s.subscription.cancelAtPeriodEnd = true;
        return delay(undefined);
      },
    },

    admin: {
      async getOverview() {
        const s = ensureState(now());
        const proUsers = s.adminUsers.filter((u) => u.plan === 'pro').length;
        return delay({
          totalUsers: s.adminUsers.length,
          proUsers,
          freeUsers: Math.max(0, s.adminUsers.length - proUsers),
          totalTasks: s.tasks.length,
          totalHabits: s.habits.filter((h) => !h.isArchived).length,
          totalGoals: s.goals.length,
          aiRequests: 0,
          aiEstimatedCost: 0,
        });
      },
      async listUsers() {
        return delay(ensureState(now()).adminUsers);
      },
      async updateUserSubscription(userId, planId, status) {
        const s = ensureState(now());
        const u = s.adminUsers.find((x) => x.id === userId);
        if (u) {
          u.plan = planId;
          u.subscriptionStatus = status;
        }
        if (userId === 'demo-user') {
          s.subscription.planId = planId;
          s.subscription.status = status;
        }
        s.auditLogs.unshift({
          id: `al-${++localCounter}`,
          actorId: 'demo-user',
          action: 'admin_update_subscription',
          targetType: 'user',
          targetId: userId,
          metadata: { planId, status },
          createdAt: now().toISOString(),
        });
        return delay(undefined);
      },
      async listConfig() {
        return delay(ensureState(now()).platformConfig);
      },
      async updateConfig(key, value) {
        const s = ensureState(now());
        const existing = s.platformConfig.find((c) => c.key === key);
        if (existing) {
          existing.value = value;
          existing.updatedAt = now().toISOString();
        } else {
          s.platformConfig.push({ key, value, updatedAt: now().toISOString() });
        }
        s.auditLogs.unshift({
          id: `al-${++localCounter}`,
          actorId: 'demo-user',
          action: 'update_platform_config',
          targetType: 'config',
          targetId: key,
          metadata: value,
          createdAt: now().toISOString(),
        });
        return delay(undefined);
      },
      async listAuditLogs() {
        return delay(ensureState(now()).auditLogs);
      },
    },
  };
}
