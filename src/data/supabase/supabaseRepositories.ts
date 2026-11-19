import { PLAN_CATALOG } from '@/domain/entitlements';
import { computeFocusSummary, DEFAULT_FOCUS_PREFERENCES } from '@/domain/focus';
import { computeHabitStreaks, isHabitCompletedOn } from '@/domain/habits';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/domain/notifications';
import { computeQuranStats, DEFAULT_SPIRITUAL_PREFERENCES, getPrayerStateForDay } from '@/domain/spiritual';
import { computeNextRecurrenceDates } from '@/domain/tasks';
import type {
  AIProposedAction,
  DashboardSnapshot,
  FocusPreferences,
  HabitSummary,
  NewCalendarEventInput,
  NewFocusSessionInput,
  NewGoalInput,
  NewHabitInput,
  NewMilestoneInput,
  NewTaskInput,
  NotificationPreferences,
  SpiritualPreferences,
  Task,
  UpdateCalendarEventInput,
  UpdateGoalInput,
  UpdateHabitInput,
  UpdateMilestoneInput,
  UpdateTaskInput,
  UserPreferencesRecord,
} from '@/domain/types';
import { addDays, toDayKey } from '@/lib/date';
import { requireSupabase } from '@/lib/supabase';
import type { Repositories } from '../repositories/types';
import {
  mapAIConversationRow,
  mapAIMessageRow,
  mapCalendarEventRow,
  mapCalendarRow,
  mapCategoryRow,
  mapFocusPreferencesRow,
  mapFocusSessionRow,
  mapGoalRow,
  mapHabitLogRow,
  mapHabitRow,
  mapMilestoneRow,
  mapNotificationPreferencesRow,
  mapNotificationRow,
  mapPreferencesRow,
  mapProfileRow,
  mapSpiritualLogRow,
  mapSpiritualPreferencesRow,
  mapSubtaskRow,
  mapTaskRow,
  type AIConversationRow,
  type AIMessageRow,
  type CalendarEventRow,
  type CalendarRow,
  type CategoryRow,
  type FocusPreferencesRow,
  type FocusSessionRow,
  type GoalMilestoneRow,
  type GoalRow,
  type HabitLogRow,
  type HabitRow,
  type NotificationPreferencesRow,
  type NotificationRow,
  type PreferencesRow,
  type ProfileRow,
  type SpiritualLogRow,
  type SpiritualPreferencesRow,
  type SubtaskRow,
  type TaskRow,
} from './mappers';

async function requireUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    throw new Error('Authentication required.');
  }
  return { client, user: data.user };
}

export function createSupabaseRepositories(): Repositories {
  const listTasks = async (): Promise<Task[]> => {
    const { client } = await requireUser();
    const { data, error } = await client
      .from('tasks')
      .select('*, subtasks(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as TaskRow[]).map(mapTaskRow);
  };

  const listEvents = async () => {
    const { client } = await requireUser();
    const { data, error } = await client
      .from('calendar_events')
      .select('*')
      .order('start_at', { ascending: true });
    if (error) throw error;
    return (data as CalendarEventRow[]).map(mapCalendarEventRow);
  };

  const listHabits = async () => {
    const { client } = await requireUser();
    const { data, error } = await client
      .from('habits')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as HabitRow[]).map(mapHabitRow);
  };

  const listHabitLogs = async (fromDate?: string, toDate?: string) => {
    const { client } = await requireUser();
    let q = client.from('habit_logs').select('*').order('log_date', { ascending: false });
    if (fromDate) q = q.gte('log_date', fromDate);
    if (toDate) q = q.lte('log_date', toDate);
    const { data, error } = await q;
    if (error) throw error;
    return (data as HabitLogRow[]).map(mapHabitLogRow);
  };

  const listGoals = async () => {
    const { client } = await requireUser();
    const { data, error } = await client
      .from('goals')
      .select('*, goal_milestones(*)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as GoalRow[]).map(mapGoalRow);
  };

  const getProfile = async () => {
    const { client, user } = await requireUser();
    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (data) return mapProfileRow(data as ProfileRow, user.email);

    const fallbackName = user.email?.split('@')[0] ?? 'User';
    const { data: created, error: insertError } = await client
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: fallbackName,
        display_name: fallbackName,
      })
      .select('*')
      .single();
    if (insertError) throw insertError;
    return mapProfileRow(created as ProfileRow, user.email);
  };

  return {
    source: 'supabase',

    dashboard: {
      async getSnapshot(day): Promise<DashboardSnapshot> {
        const todayKey = toDayKey(day);
        const [
          profile,
          tasks,
          events,
          habits,
          logs,
          goals,
          focusSessions,
          notifications,
          spiritualPrefs,
          spiritualLogs,
        ] = await Promise.all([
          getProfile(),
          listTasks(),
          listEvents(),
          listHabits(),
          listHabitLogs(),
          listGoals(),
          (async () => {
            const { client } = await requireUser();
            const { data } = await client
              .from('focus_sessions')
              .select('*')
              .order('started_at', { ascending: false })
              .limit(100);
            return ((data ?? []) as FocusSessionRow[]).map(mapFocusSessionRow);
          })(),
          (async () => {
            const { client } = await requireUser();
            const { data } = await client
              .from('notifications')
              .select('*')
              .neq('status', 'dismissed')
              .order('scheduled_at', { ascending: false })
              .limit(10);
            return ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
          })(),
          (async () => {
            const { client, user } = await requireUser();
            const { data } = await client
              .from('spiritual_preferences')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle();
            return data ? mapSpiritualPreferencesRow(data as SpiritualPreferencesRow) : DEFAULT_SPIRITUAL_PREFERENCES;
          })(),
          (async () => {
            const { client } = await requireUser();
            const { data } = await client
              .from('spiritual_logs')
              .select('*')
              .eq('activity_date', todayKey);
            return ((data ?? []) as SpiritualLogRow[]).map(mapSpiritualLogRow);
          })(),
        ]);

        const activeHabits = habits.filter((h) => !h.isArchived);
        const habitSummaries: HabitSummary[] = activeHabits.map((h) => {
          const logsByDate = new Map(logs.filter((l) => l.habitId === h.id).map((l) => [l.logDate, l]));
          const streaks = computeHabitStreaks(h, logs, todayKey);
          const lastSevenDays = Array.from({ length: 7 }, (_, i) => {
            const dKey = toDayKey(addDays(day, i - 6));
            return isHabitCompletedOn(h, logsByDate, dKey);
          });
          return {
            id: h.id,
            name: h.name,
            icon: h.icon,
            completedToday: isHabitCompletedOn(h, logsByDate, todayKey),
            streak: streaks.current,
            lastSevenDays,
            spiritual: h.spiritual,
          };
        });

        const nowMs = Date.now();
        const schedule = events
          .filter((ev) => !ev.taskId)
          .map((ev) => ({
            id: ev.id,
            kind: 'event' as const,
            title: ev.title,
            startAt: ev.startAt,
            endAt: ev.endAt,
            done: new Date(ev.endAt).getTime() <= nowMs,
          }));

        const quranStats = computeQuranStats(spiritualLogs, day, spiritualPrefs.settings.dailyQuranPages);
        const prayerState = getPrayerStateForDay(spiritualLogs, todayKey);
        const prayersCompletedToday = Object.values(prayerState).filter(Boolean).length;
        const azkarCompletedToday = spiritualLogs.filter((l) => l.activityType === 'azkar' && l.completedAt).length;

        return {
          source: 'supabase',
          generatedAt: new Date().toISOString(),
          profile,
          tasks,
          schedule,
          habits: habitSummaries,
          goals: goals.filter((g) => g.status === 'active'),
          focus: computeFocusSummary(focusSessions, day),
          insights: [],
          notifications,
          spiritualSummary: spiritualPrefs.enabled
            ? {
                quranPagesToday: quranStats.pagesToday,
                quranDailyTarget: quranStats.dailyTarget,
                prayersCompletedToday,
                azkarCompletedToday,
              }
            : undefined,
        };
      },
    },

    tasks: {
      list: listTasks,

      async create(input: NewTaskInput) {
        const { client, user } = await requireUser();
        const endAt =
          input.endAt ??
          (input.startAt && input.estimatedMinutes
            ? new Date(new Date(input.startAt).getTime() + input.estimatedMinutes * 60_000).toISOString()
            : null);

        const { data, error } = await client
          .from('tasks')
          .insert({
            user_id: user.id,
            title: input.title.trim(),
            notes: input.notes?.trim() || null,
            status: input.status ?? 'todo',
            priority: input.priority,
            category_id: input.categoryId ?? null,
            tags: input.tags ?? [],
            start_at: input.startAt ?? null,
            end_at: endAt,
            due_at: input.dueAt ?? null,
            estimated_minutes: input.estimatedMinutes ?? null,
            recurrence_rule: input.recurrence ?? null,
          })
          .select('*, subtasks(*)')
          .single();
        if (error) throw error;
        return mapTaskRow(data as TaskRow);
      },

      async update(id: string, patch: UpdateTaskInput) {
        const { client } = await requireUser();
        const payload: Record<string, unknown> = {};
        if (patch.title !== undefined) payload.title = patch.title.trim();
        if (patch.notes !== undefined) payload.notes = patch.notes?.trim() || null;
        if (patch.status !== undefined) {
          payload.status = patch.status;
          payload.completed_at = patch.status === 'completed' ? new Date().toISOString() : null;
        }
        if (patch.priority !== undefined) payload.priority = patch.priority;
        if (patch.categoryId !== undefined) payload.category_id = patch.categoryId;
        if (patch.tags !== undefined) payload.tags = patch.tags;
        if (patch.startAt !== undefined) payload.start_at = patch.startAt;
        if (patch.endAt !== undefined) payload.end_at = patch.endAt;
        if (patch.dueAt !== undefined) payload.due_at = patch.dueAt;
        if (patch.estimatedMinutes !== undefined) payload.estimated_minutes = patch.estimatedMinutes;
        if (patch.recurrence !== undefined) payload.recurrence_rule = patch.recurrence;

        const { data, error } = await client
          .from('tasks')
          .update(payload)
          .eq('id', id)
          .select('*, subtasks(*)')
          .single();
        if (error) throw error;
        return mapTaskRow(data as TaskRow);
      },

      async delete(id: string) {
        const { client } = await requireUser();
        const { error } = await client.from('tasks').delete().eq('id', id);
        if (error) throw error;
      },

      async setCompleted(id: string, completed: boolean) {
        const { client, user } = await requireUser();
        const nowIso = new Date().toISOString();
        const { data, error } = await client
          .from('tasks')
          .update({
            status: completed ? 'completed' : 'todo',
            completed_at: completed ? nowIso : null,
          })
          .eq('id', id)
          .select('*, subtasks(*)')
          .single();
        if (error) throw error;

        const updated = mapTaskRow(data as TaskRow);

        if (completed && updated.recurrence) {
          const nextDates = computeNextRecurrenceDates(updated);
          if (nextDates) {
            await client.from('tasks').insert({
              user_id: user.id,
              title: updated.title,
              notes: updated.notes ?? null,
              status: 'todo',
              priority: updated.priority,
              category_id: updated.categoryId ?? null,
              tags: updated.tags,
              start_at: nextDates.startAt ?? null,
              end_at: nextDates.endAt ?? null,
              due_at: nextDates.dueAt ?? null,
              estimated_minutes: updated.estimatedMinutes ?? null,
              recurrence_rule: updated.recurrence,
            });
          }
        }

        return updated;
      },

      async addSubtask(taskId: string, title: string) {
        const { client, user } = await requireUser();
        const { data: existing } = await client
          .from('subtasks')
          .select('position')
          .eq('task_id', taskId)
          .order('position', { ascending: false })
          .limit(1);
        const nextPos = existing && existing[0] ? (existing[0].position as number) + 1 : 0;

        const { data, error } = await client
          .from('subtasks')
          .insert({
            task_id: taskId,
            user_id: user.id,
            title: title.trim(),
            position: nextPos,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapSubtaskRow(data as SubtaskRow);
      },

      async toggleSubtask(subtaskId: string, completed: boolean) {
        const { client } = await requireUser();
        const { data, error } = await client
          .from('subtasks')
          .update({ completed })
          .eq('id', subtaskId)
          .select('*')
          .single();
        if (error) throw error;
        return mapSubtaskRow(data as SubtaskRow);
      },

      async deleteSubtask(subtaskId: string) {
        const { client } = await requireUser();
        const { error } = await client.from('subtasks').delete().eq('id', subtaskId);
        if (error) throw error;
      },
    },

    categories: {
      async list() {
        const { client } = await requireUser();
        const { data, error } = await client.from('task_categories').select('*').order('name');
        if (error) throw error;
        return (data as CategoryRow[]).map(mapCategoryRow);
      },

      async create(name: string, color: string) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('task_categories')
          .insert({ user_id: user.id, name: name.trim(), color })
          .select('*')
          .single();
        if (error) throw error;
        return mapCategoryRow(data as CategoryRow);
      },

      async delete(id: string) {
        const { client } = await requireUser();
        const { error } = await client.from('task_categories').delete().eq('id', id);
        if (error) throw error;
      },
    },

    calendar: {
      async listCalendars() {
        const { client } = await requireUser();
        const { data, error } = await client.from('calendars').select('*').order('created_at');
        if (error) throw error;
        return (data as CalendarRow[]).map(mapCalendarRow);
      },

      async createCalendar(name: string, color: string) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('calendars')
          .insert({ user_id: user.id, name: name.trim(), color })
          .select('*')
          .single();
        if (error) throw error;
        return mapCalendarRow(data as CalendarRow);
      },

      listEvents,

      async createEvent(input: NewCalendarEventInput) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('calendar_events')
          .insert({
            user_id: user.id,
            calendar_id: input.calendarId ?? null,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            location: input.location?.trim() || null,
            start_at: input.startAt,
            end_at: input.endAt,
            all_day: input.allDay ?? false,
            timezone: input.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
            color: input.color ?? '#2D699B',
            task_id: input.taskId ?? null,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapCalendarEventRow(data as CalendarEventRow);
      },

      async updateEvent(id: string, patch: UpdateCalendarEventInput) {
        const { client } = await requireUser();
        const payload: Record<string, unknown> = {};
        if (patch.calendarId !== undefined) payload.calendar_id = patch.calendarId;
        if (patch.title !== undefined) payload.title = patch.title.trim();
        if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
        if (patch.location !== undefined) payload.location = patch.location?.trim() || null;
        if (patch.startAt !== undefined) payload.start_at = patch.startAt;
        if (patch.endAt !== undefined) payload.end_at = patch.endAt;
        if (patch.allDay !== undefined) payload.all_day = patch.allDay;
        if (patch.timezone !== undefined) payload.timezone = patch.timezone;
        if (patch.color !== undefined) payload.color = patch.color;
        if (patch.taskId !== undefined) payload.task_id = patch.taskId;

        const { data, error } = await client
          .from('calendar_events')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return mapCalendarEventRow(data as CalendarEventRow);
      },

      async deleteEvent(id: string) {
        const { client } = await requireUser();
        const { error } = await client.from('calendar_events').delete().eq('id', id);
        if (error) throw error;
      },
    },

    habits: {
      list: listHabits,
      listLogs: listHabitLogs,

      async create(input: NewHabitInput) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('habits')
          .insert({
            user_id: user.id,
            name: input.name.trim(),
            description: input.description?.trim() || null,
            icon: input.icon,
            color: input.color,
            category: input.category,
            frequency_type: input.frequencyType,
            frequency_config: input.frequencyConfig,
            target_count: input.targetCount,
            reminder_time: input.reminderTime || null,
            start_date: input.startDate,
            end_date: input.endDate || null,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapHabitRow(data as HabitRow);
      },

      async update(id: string, patch: UpdateHabitInput) {
        const { client } = await requireUser();
        const payload: Record<string, unknown> = {};
        if (patch.name !== undefined) payload.name = patch.name.trim();
        if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
        if (patch.icon !== undefined) payload.icon = patch.icon;
        if (patch.color !== undefined) payload.color = patch.color;
        if (patch.category !== undefined) payload.category = patch.category;
        if (patch.frequencyType !== undefined) payload.frequency_type = patch.frequencyType;
        if (patch.frequencyConfig !== undefined) payload.frequency_config = patch.frequencyConfig;
        if (patch.targetCount !== undefined) payload.target_count = patch.targetCount;
        if (patch.reminderTime !== undefined) payload.reminder_time = patch.reminderTime;
        if (patch.startDate !== undefined) payload.start_date = patch.startDate;
        if (patch.endDate !== undefined) payload.end_date = patch.endDate;
        if (patch.isArchived !== undefined) payload.is_archived = patch.isArchived;

        const { data, error } = await client
          .from('habits')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return mapHabitRow(data as HabitRow);
      },

      async delete(id: string) {
        const { client } = await requireUser();
        const { error } = await client.from('habits').delete().eq('id', id);
        if (error) throw error;
      },

      async logProgress(habitId: string, logDate: string, completedCount: number, notes?: string) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('habit_logs')
          .upsert(
            {
              user_id: user.id,
              habit_id: habitId,
              log_date: logDate,
              completed_count: Math.max(0, completedCount),
              notes: notes?.trim() || null,
              completed_at: completedCount > 0 ? new Date().toISOString() : null,
            },
            { onConflict: 'habit_id,log_date' },
          )
          .select('*')
          .single();
        if (error) throw error;
        return mapHabitLogRow(data as HabitLogRow);
      },

      async setDoneToday(id: string, done: boolean) {
        const { client, user } = await requireUser();
        const today = new Date();
        const todayKey = toDayKey(today);
        const { data: hRow, error: hErr } = await client.from('habits').select('*').eq('id', id).single();
        if (hErr) throw hErr;
        const habit = mapHabitRow(hRow as HabitRow);

        await client.from('habit_logs').upsert(
          {
            user_id: user.id,
            habit_id: id,
            log_date: todayKey,
            completed_count: done ? habit.targetCount : 0,
            completed_at: done ? today.toISOString() : null,
          },
          { onConflict: 'habit_id,log_date' },
        );

        const logs = await listHabitLogs();
        const logsByDate = new Map(logs.filter((l) => l.habitId === id).map((l) => [l.logDate, l]));
        const streaks = computeHabitStreaks(habit, logs, todayKey);
        return {
          id: habit.id,
          name: habit.name,
          icon: habit.icon,
          completedToday: done,
          streak: streaks.current,
          lastSevenDays: Array.from({ length: 7 }, (_, i) =>
            isHabitCompletedOn(habit, logsByDate, toDayKey(addDays(today, i - 6))),
          ),
        };
      },
    },

    goals: {
      list: listGoals,

      async create(input: NewGoalInput) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('goals')
          .insert({
            user_id: user.id,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            category: input.category,
            icon: input.icon ?? 'flag',
            color: input.color ?? '#176B56',
            start_date: input.startDate,
            target_date: input.targetDate || null,
            priority: input.priority,
            status: input.status ?? 'active',
            manual_progress: input.manualProgress ?? 0,
            target_value: input.targetValue ?? null,
            current_value: input.currentValue ?? 0,
          })
          .select('*, goal_milestones(*)')
          .single();
        if (error) throw error;
        return mapGoalRow(data as GoalRow);
      },

      async update(id: string, patch: UpdateGoalInput) {
        const { client } = await requireUser();
        const payload: Record<string, unknown> = {};
        if (patch.title !== undefined) payload.title = patch.title.trim();
        if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
        if (patch.category !== undefined) payload.category = patch.category;
        if (patch.icon !== undefined) payload.icon = patch.icon;
        if (patch.color !== undefined) payload.color = patch.color;
        if (patch.startDate !== undefined) payload.start_date = patch.startDate;
        if (patch.targetDate !== undefined) payload.target_date = patch.targetDate;
        if (patch.priority !== undefined) payload.priority = patch.priority;
        if (patch.status !== undefined) payload.status = patch.status;
        if (patch.manualProgress !== undefined) payload.manual_progress = patch.manualProgress;
        if (patch.targetValue !== undefined) payload.target_value = patch.targetValue;
        if (patch.currentValue !== undefined) payload.current_value = patch.currentValue;

        const { data, error } = await client
          .from('goals')
          .update(payload)
          .eq('id', id)
          .select('*, goal_milestones(*)')
          .single();
        if (error) throw error;
        return mapGoalRow(data as GoalRow);
      },

      async delete(id: string) {
        const { client } = await requireUser();
        const { error } = await client.from('goals').delete().eq('id', id);
        if (error) throw error;
      },

      async addMilestone(input: NewMilestoneInput) {
        const { client, user } = await requireUser();
        const { data: existing } = await client
          .from('goal_milestones')
          .select('sort_order')
          .eq('goal_id', input.goalId)
          .order('sort_order', { ascending: false })
          .limit(1);
        const nextOrder = existing && existing[0] ? (existing[0].sort_order as number) + 1 : 0;

        const { data, error } = await client
          .from('goal_milestones')
          .insert({
            user_id: user.id,
            goal_id: input.goalId,
            title: input.title.trim(),
            description: input.description?.trim() || null,
            target_date: input.targetDate || null,
            sort_order: nextOrder,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapMilestoneRow(data as GoalMilestoneRow);
      },

      async updateMilestone(id: string, patch: UpdateMilestoneInput) {
        const { client } = await requireUser();
        const payload: Record<string, unknown> = {};
        if (patch.title !== undefined) payload.title = patch.title.trim();
        if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
        if (patch.targetDate !== undefined) payload.target_date = patch.targetDate;
        if (patch.isCompleted !== undefined) {
          payload.is_completed = patch.isCompleted;
          payload.completed_at = patch.isCompleted ? new Date().toISOString() : null;
        }
        if (patch.sortOrder !== undefined) payload.sort_order = patch.sortOrder;

        const { data, error } = await client
          .from('goal_milestones')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return mapMilestoneRow(data as GoalMilestoneRow);
      },

      async deleteMilestone(id: string) {
        const { client } = await requireUser();
        const { error } = await client.from('goal_milestones').delete().eq('id', id);
        if (error) throw error;
      },

      async reorderMilestones(goalId: string, orderedIds: string[]) {
        const { client } = await requireUser();
        await Promise.all(
          orderedIds.map((id, index) =>
            client.from('goal_milestones').update({ sort_order: index }).eq('id', id).eq('goal_id', goalId),
          ),
        );
      },
    },

    profile: {
      get: getProfile,

      async update(patch) {
        const { client, user } = await requireUser();
        const payload: Record<string, unknown> = {};
        if (patch.firstName !== undefined) payload.first_name = patch.firstName.trim();
        if (patch.displayName !== undefined) payload.display_name = patch.displayName.trim();
        if (patch.timezone !== undefined) payload.timezone = patch.timezone;

        const { data, error } = await client
          .from('profiles')
          .update(payload)
          .eq('id', user.id)
          .select('*')
          .single();
        if (error) throw error;
        return mapProfileRow(data as ProfileRow, user.email);
      },
    },

    preferences: {
      async get(): Promise<UserPreferencesRecord> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) return mapPreferencesRow(data as PreferencesRow);

        const { data: created, error: insertError } = await client
          .from('user_preferences')
          .upsert({ user_id: user.id })
          .select('*')
          .single();
        if (insertError) throw insertError;
        return mapPreferencesRow(created as PreferencesRow);
      },

      async upsert(prefs: UserPreferencesRecord): Promise<UserPreferencesRecord> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme: prefs.theme,
            locale: prefs.locale,
            sidebar_collapsed: prefs.sidebarCollapsed,
            spiritual_enabled: prefs.spiritualEnabled,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapPreferencesRow(data as PreferencesRow);
      },
    },

    focus: {
      async getPreferences(): Promise<FocusPreferences> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('focus_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) return mapFocusPreferencesRow(data as FocusPreferencesRow);
        return DEFAULT_FOCUS_PREFERENCES;
      },

      async updatePreferences(prefs: FocusPreferences): Promise<FocusPreferences> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('focus_preferences')
          .upsert({
            user_id: user.id,
            focus_duration: prefs.focusDuration,
            short_break_duration: prefs.shortBreakDuration,
            long_break_duration: prefs.longBreakDuration,
            sessions_before_long_break: prefs.sessionsBeforeLongBreak,
            auto_start_breaks: prefs.autoStartBreaks,
            auto_start_focus: prefs.autoStartFocus,
            ambient_sound: prefs.ambientSound,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapFocusPreferencesRow(data as FocusPreferencesRow);
      },

      async listSessions() {
        const { client } = await requireUser();
        const { data, error } = await client
          .from('focus_sessions')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        return (data as FocusSessionRow[]).map(mapFocusSessionRow);
      },

      async createSession(input: NewFocusSessionInput) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('focus_sessions')
          .insert({
            user_id: user.id,
            task_id: input.taskId ?? null,
            started_at: input.startedAt,
            ended_at: input.endedAt ?? null,
            duration_seconds: Math.max(0, Math.round(input.durationSeconds)),
            session_type: input.sessionType,
            status: input.status,
            notes: input.notes?.trim() || null,
            distraction_count: input.distractionCount ?? 0,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapFocusSessionRow(data as FocusSessionRow);
      },
    },

    ai: {
      async listConversations() {
        const { client } = await requireUser();
        const { data, error } = await client
          .from('ai_conversations')
          .select('*')
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return (data as AIConversationRow[]).map(mapAIConversationRow);
      },

      async listMessages(conversationId: string) {
        const { client } = await requireUser();
        const { data, error } = await client
          .from('ai_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data as AIMessageRow[]).map(mapAIMessageRow);
      },

      async deleteConversation(conversationId: string) {
        const { client } = await requireUser();
        const { error } = await client.from('ai_conversations').delete().eq('id', conversationId);
        if (error) throw error;
      },

      async sendMessage(params) {
        const { client } = await requireUser();
        const { data, error } = await client.functions.invoke('rafiq-chat', { body: params });
        if (error) throw new Error(error.message || 'Rafiq AI service unavailable');
        return data as { conversationId: string; reply: string; proposedActions: AIProposedAction[] };
      },

      async executeAction(action: AIProposedAction) {
        const { client } = await requireUser();
        const { error } = await client.functions.invoke('rafiq-execute-action', {
          body: { type: action.type, payload: action.payload },
        });
        if (error) throw new Error(error.message || 'Failed to execute AI action');
      },
    },

    spiritual: {
      async getPreferences(): Promise<SpiritualPreferences> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('spiritual_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) return mapSpiritualPreferencesRow(data as SpiritualPreferencesRow);
        return DEFAULT_SPIRITUAL_PREFERENCES;
      },

      async updatePreferences(prefs: SpiritualPreferences): Promise<SpiritualPreferences> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('spiritual_preferences')
          .upsert({
            user_id: user.id,
            enabled: prefs.enabled,
            settings: prefs.settings,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapSpiritualPreferencesRow(data as SpiritualPreferencesRow);
      },

      async listLogs(fromDate?: string, toDate?: string) {
        const { client } = await requireUser();
        let q = client.from('spiritual_logs').select('*').order('activity_date', { ascending: false });
        if (fromDate) q = q.gte('activity_date', fromDate);
        if (toDate) q = q.lte('activity_date', toDate);
        const { data, error } = await q;
        if (error) throw error;
        return (data as SpiritualLogRow[]).map(mapSpiritualLogRow);
      },

      async logActivity({ activityType, activityDate, activityData, completed }) {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('spiritual_logs')
          .insert({
            user_id: user.id,
            activity_type: activityType,
            activity_date: activityDate,
            activity_data: activityData,
            completed_at: completed ? new Date().toISOString() : null,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapSpiritualLogRow(data as SpiritualLogRow);
      },
    },

    notifications: {
      async getPreferences(): Promise<NotificationPreferences> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data) return mapNotificationPreferencesRow(data as NotificationPreferencesRow);
        return DEFAULT_NOTIFICATION_PREFERENCES;
      },

      async updatePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences> {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('notification_preferences')
          .upsert({
            user_id: user.id,
            settings: prefs.settings,
            quiet_hours: prefs.quietHours,
            timezone: prefs.timezone,
          })
          .select('*')
          .single();
        if (error) throw error;
        return mapNotificationPreferencesRow(data as NotificationPreferencesRow);
      },

      async list() {
        const { client } = await requireUser();
        const { data, error } = await client
          .from('notifications')
          .select('*')
          .neq('status', 'dismissed')
          .order('scheduled_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data as NotificationRow[]).map(mapNotificationRow);
      },

      async markRead(id: string) {
        const { client } = await requireUser();
        const { error } = await client
          .from('notifications')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      },

      async markAllRead() {
        const { client, user } = await requireUser();
        const { error } = await client
          .from('notifications')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .in('status', ['pending', 'delivered']);
        if (error) throw error;
      },

      async dismiss(id: string) {
        const { client } = await requireUser();
        const { error } = await client
          .from('notifications')
          .update({ status: 'dismissed' })
          .eq('id', id);
        if (error) throw error;
      },

      async savePushSubscription(endpoint: string, subscription: PushSubscriptionJSON) {
        const { client, user } = await requireUser();
        const { error } = await client.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint,
            subscription,
          },
          { onConflict: 'user_id,endpoint' },
        );
        if (error) throw error;
      },

      async removePushSubscription(endpoint: string) {
        const { client, user } = await requireUser();
        const { error } = await client
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', endpoint);
        if (error) throw error;
      },
    },

    subscriptions: {
      async listPlans() {
        const { client } = await requireUser();
        const { data, error } = await client
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly_cents', { ascending: true });
        if (error || !data || data.length === 0) return Object.values(PLAN_CATALOG);
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          priceMonthlyCents: row.price_monthly_cents,
          priceYearlyCents: row.price_yearly_cents,
          entitlements: row.entitlements,
          limits: row.limits,
        }));
      },

      async getCurrent() {
        const { client, user } = await requireUser();
        const { data, error } = await client
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          return {
            id: 'default-free',
            planId: 'free',
            status: 'active',
            provider: 'none',
            currentPeriodStart: new Date().toISOString(),
            cancelAtPeriodEnd: false,
          };
        }
        return {
          id: data.id,
          planId: data.plan_id,
          status: data.status,
          provider: data.provider,
          currentPeriodStart: data.current_period_start,
          currentPeriodEnd: data.current_period_end ?? undefined,
          gracePeriodEnd: data.grace_period_end ?? undefined,
          cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
        };
      },

      async getUsage() {
        const { client, user } = await requireUser();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [{ count: habitsCount }, { count: goalsCount }, { count: aiCount }] = await Promise.all([
          client.from('habits').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_archived', false),
          client.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'active'),
          client.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', todayStart.toISOString()),
        ]);
        return {
          activeHabits: habitsCount ?? 0,
          activeGoals: goalsCount ?? 0,
          aiRequestsToday: aiCount ?? 0,
        };
      },

      async requestPlanChange(targetPlan) {
        const { client } = await requireUser();
        const { data, error } = await client.functions.invoke('subscription-manager', {
          body: { action: 'request_plan_change', targetPlan },
        });
        if (error) throw new Error(error.message || 'Subscription change failed');
        return data as { ok: boolean; message: string };
      },

      async cancelAtPeriodEnd() {
        const { client } = await requireUser();
        const { error } = await client.functions.invoke('subscription-manager', {
          body: { action: 'cancel_at_period_end' },
        });
        if (error) throw new Error(error.message || 'Cancel failed');
      },
    },

    admin: {
      async getOverview() {
        const { client } = await requireUser();
        const { data, error } = await client.rpc('admin_get_overview');
        if (error) throw error;
        return data;
      },

      async listUsers() {
        const { client } = await requireUser();
        const { data, error } = await client.rpc('admin_list_users');
        if (error) throw error;
        return (data ?? []).map((row: {
          id: string;
          display_name: string;
          role: 'user' | 'admin';
          plan: 'free' | 'pro';
          subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
          created_at: string;
        }) => ({
          id: row.id,
          displayName: row.display_name,
          role: row.role,
          plan: row.plan,
          subscriptionStatus: row.subscription_status,
          createdAt: row.created_at,
        }));
      },

      async updateUserSubscription(userId, planId, status) {
        const { client } = await requireUser();
        const { error } = await client.rpc('admin_update_user_subscription', {
          p_target_user_id: userId,
          p_plan_id: planId,
          p_status: status,
        });
        if (error) throw error;
      },

      async listConfig() {
        const { client } = await requireUser();
        const { data, error } = await client.from('platform_config').select('*').order('key');
        if (error) throw error;
        return (data ?? []).map((row) => ({
          key: row.key,
          value: row.value,
          updatedAt: row.updated_at,
        }));
      },

      async updateConfig(key, value) {
        const { client, user } = await requireUser();
        const { error } = await client
          .from('platform_config')
          .upsert({ key, value, updated_by: user.id });
        if (error) throw error;
      },

      async listAuditLogs() {
        const { client } = await requireUser();
        const { data, error } = await client
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data ?? []).map((row) => ({
          id: row.id,
          actorId: row.actor_id ?? undefined,
          action: row.action,
          targetType: row.target_type,
          targetId: row.target_id ?? undefined,
          metadata: row.metadata ?? {},
          createdAt: row.created_at,
        }));
      },
    },
  };
}
