import { describe, expect, it } from 'vitest';
import {
  mapCalendarEventRow,
  mapCategoryRow,
  mapGoalRow,
  mapHabitLogRow,
  mapHabitRow,
  mapPreferencesRow,
  mapProfileRow,
  mapTaskRow,
  type TaskRow,
} from '../mappers';

describe('supabase mappers', () => {
  it('maps a TaskRow with sorted subtasks into a domain Task', () => {
    const row: TaskRow = {
      id: 'task-1',
      user_id: 'user-1',
      category_id: 'cat-1',
      title: 'Ship Phase 2',
      notes: 'Verify RLS',
      status: 'in_progress',
      priority: 'urgent',
      tags: ['saas', 'security'],
      due_at: '2026-11-20T12:00:00.000Z',
      start_at: '2026-11-20T09:00:00.000Z',
      end_at: '2026-11-20T10:30:00.000Z',
      estimated_minutes: 90,
      recurrence_rule: { frequency: 'weekly', interval: 1 },
      completed_at: null,
      created_at: '2026-11-18T08:00:00.000Z',
      updated_at: '2026-11-18T08:00:00.000Z',
      subtasks: [
        {
          id: 's2',
          task_id: 'task-1',
          user_id: 'user-1',
          title: 'Second',
          completed: false,
          position: 1,
          created_at: '2026-11-18T08:01:00.000Z',
        },
        {
          id: 's1',
          task_id: 'task-1',
          user_id: 'user-1',
          title: 'First',
          completed: true,
          position: 0,
          created_at: '2026-11-18T08:00:00.000Z',
        },
      ],
    };

    const task = mapTaskRow(row);
    expect(task.id).toBe('task-1');
    expect(task.categoryId).toBe('cat-1');
    expect(task.recurrence).toEqual({ frequency: 'weekly', interval: 1 });
    expect(task.subtasks?.map((s) => s.title)).toEqual(['First', 'Second']);
  });

  it('maps category, profile, and preferences rows', () => {
    expect(mapCategoryRow({ id: 'c1', user_id: 'u1', name: 'Work', color: '#176B56' })).toEqual({
      id: 'c1',
      name: 'Work',
      color: '#176B56',
    });

    const profile = mapProfileRow(
      {
        id: 'u1',
        first_name: 'Sara',
        display_name: 'Sara A.',
        avatar_url: null,
        plan: 'free',
        timezone: 'Asia/Dubai',
      },
      'sara@example.com',
    );
    expect(profile.email).toBe('sara@example.com');
    expect(profile.timezone).toBe('Asia/Dubai');

    expect(
      mapPreferencesRow({
        user_id: 'u1',
        theme: 'dark',
        locale: 'ar',
        sidebar_collapsed: true,
        spiritual_enabled: false,
      }),
    ).toEqual({
      theme: 'dark',
      locale: 'ar',
      sidebarCollapsed: true,
      spiritualEnabled: false,
    });
  });

  it('maps Phase 3 calendar_events, habits, habit_logs, and goals rows', () => {
    const ev = mapCalendarEventRow({
      id: 'ev1',
      user_id: 'u1',
      calendar_id: 'c1',
      title: 'Sync',
      description: null,
      location: 'Room A',
      start_at: '2026-11-18T10:00:00.000Z',
      end_at: '2026-11-18T11:00:00.000Z',
      all_day: false,
      timezone: 'UTC',
      color: '#176B56',
      task_id: null,
      created_at: '2026-11-18T08:00:00.000Z',
      updated_at: '2026-11-18T08:00:00.000Z',
    });
    expect(ev.location).toBe('Room A');

    const habit = mapHabitRow({
      id: 'h1',
      user_id: 'u1',
      name: 'Walk',
      description: null,
      icon: 'run',
      color: '#176B56',
      category: 'health',
      frequency_type: 'weekdays',
      frequency_config: { weekdays: [1, 3, 5] },
      target_count: 1,
      reminder_time: '07:30:00',
      start_date: '2026-11-01',
      end_date: null,
      is_archived: false,
      created_at: '2026-11-01T00:00:00.000Z',
      updated_at: '2026-11-01T00:00:00.000Z',
    });
    expect(habit.reminderTime).toBe('07:30');
    expect(habit.frequencyConfig.weekdays).toEqual([1, 3, 5]);

    const log = mapHabitLogRow({
      id: 'hl1',
      user_id: 'u1',
      habit_id: 'h1',
      log_date: '2026-11-18',
      completed_count: 1,
      notes: 'Felt great',
      completed_at: '2026-11-18T08:00:00.000Z',
    });
    expect(log.notes).toBe('Felt great');

    const goal = mapGoalRow({
      id: 'g1',
      user_id: 'u1',
      title: 'Read 12 books',
      description: null,
      category: 'educational',
      icon: 'book',
      color: '#2D699B',
      start_date: '2026-01-01',
      target_date: '2026-12-31',
      priority: 'medium',
      status: 'active',
      manual_progress: 0,
      target_value: 12,
      current_value: 9,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-11-18T00:00:00.000Z',
      goal_milestones: [
        {
          id: 'm2',
          user_id: 'u1',
          goal_id: 'g1',
          title: 'Second',
          description: null,
          target_date: null,
          is_completed: false,
          completed_at: null,
          sort_order: 1,
        },
        {
          id: 'm1',
          user_id: 'u1',
          goal_id: 'g1',
          title: 'First',
          description: null,
          target_date: null,
          is_completed: true,
          completed_at: '2026-05-01T00:00:00.000Z',
          sort_order: 0,
        },
      ],
    });
    expect(goal.milestones.map((m) => m.title)).toEqual(['First', 'Second']);
  });
});
