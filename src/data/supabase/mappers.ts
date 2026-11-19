import type {
  AIConversation,
  AIMessage,
  AIProposedAction,
  AmbientSoundKind,
  Calendar,
  CalendarEvent,
  FocusPreferences,
  FocusSession,
  FocusSessionStatus,
  FocusSessionType,
  Goal,
  GoalCategory,
  GoalMilestone,
  GoalStatus,
  Habit,
  HabitFrequencyConfig,
  HabitFrequencyType,
  HabitIcon,
  HabitLog,
  NotificationCategorySettings,
  NotificationItem,
  NotificationPreferences,
  NotificationStatus,
  NotificationType,
  PlanTier,
  Priority,
  QuietHoursConfig,
  RecurrenceRule,
  SpiritualActivityType,
  SpiritualLog,
  SpiritualPreferences,
  SpiritualSettings,
  Subtask,
  Task,
  TaskCategory,
  TaskStatus,
  UserPreferencesRecord,
  UserProfile,
  UserRole,
} from '@/domain/types';

export interface ProfileRow {
  id: string;
  first_name: string;
  display_name: string;
  avatar_url: string | null;
  plan: PlanTier;
  role?: UserRole;
  timezone: string;
}

export interface PreferencesRow {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'ar';
  sidebar_collapsed: boolean;
  spiritual_enabled: boolean;
}

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
}

export interface SubtaskRow {
  id: string;
  task_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority;
  tags: string[] | null;
  due_at: string | null;
  start_at: string | null;
  end_at: string | null;
  estimated_minutes: number | null;
  recurrence_rule: RecurrenceRule | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  subtasks?: SubtaskRow[];
}

export interface CalendarRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_default: boolean;
}

export interface CalendarEventRow {
  id: string;
  user_id: string;
  calendar_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  timezone: string;
  color: string;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: HabitIcon;
  color: string;
  category: string;
  frequency_type: HabitFrequencyType;
  frequency_config: HabitFrequencyConfig | null;
  target_count: number;
  reminder_time: string | null;
  start_date: string;
  end_date: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitLogRow {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  completed_count: number;
  notes: string | null;
  completed_at: string | null;
}

export interface GoalMilestoneRow {
  id: string;
  user_id: string;
  goal_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

export interface GoalRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  icon: string;
  color: string;
  start_date: string;
  target_date: string | null;
  priority: Priority;
  status: GoalStatus;
  manual_progress: number;
  target_value: number | null;
  current_value: number;
  created_at: string;
  updated_at: string;
  goal_milestones?: GoalMilestoneRow[];
}

export interface FocusPreferencesRow {
  user_id: string;
  focus_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  sessions_before_long_break: number;
  auto_start_breaks: boolean;
  auto_start_focus: boolean;
  ambient_sound: AmbientSoundKind;
}

export interface FocusSessionRow {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  session_type: FocusSessionType;
  status: FocusSessionStatus;
  notes: string | null;
  distraction_count: number;
  created_at: string;
}

export interface AIConversationRow {
  id: string;
  user_id: string;
  title: string;
  provider: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessageRow {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: { proposedActions?: AIProposedAction[] } | null;
  created_at: string;
}

export interface SpiritualPreferencesRow {
  user_id: string;
  enabled: boolean;
  settings: Partial<SpiritualSettings> | null;
}

export interface SpiritualLogRow {
  id: string;
  user_id: string;
  activity_type: SpiritualActivityType;
  activity_date: string;
  activity_data: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
}

export interface NotificationPreferencesRow {
  user_id: string;
  settings: Partial<NotificationCategorySettings> | null;
  quiet_hours: Partial<QuietHoursConfig> | null;
  timezone: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  dedupe_key: string | null;
  scheduled_at: string;
  delivered_at: string | null;
  read_at: string | null;
  status: NotificationStatus;
  created_at: string;
}

export function mapSubtaskRow(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
  };
}

export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    status: row.status,
    priority: row.priority,
    categoryId: row.category_id ?? undefined,
    tags: row.tags ?? [],
    dueAt: row.due_at ?? undefined,
    startAt: row.start_at ?? undefined,
    endAt: row.end_at ?? undefined,
    estimatedMinutes: row.estimated_minutes ?? undefined,
    recurrence: row.recurrence_rule ?? undefined,
    subtasks: row.subtasks
      ? [...row.subtasks].sort((a, b) => a.position - b.position).map(mapSubtaskRow)
      : undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryRow(row: CategoryRow): TaskCategory {
  return { id: row.id, name: row.name, color: row.color };
}

export function mapProfileRow(row: ProfileRow, email?: string): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name || row.display_name || 'User',
    displayName: row.display_name || row.first_name || 'User',
    avatarUrl: row.avatar_url ?? undefined,
    plan: row.plan,
    role: row.role ?? 'user',
    timezone: row.timezone,
    email,
  };
}

export function mapPreferencesRow(row: PreferencesRow): UserPreferencesRecord {
  return {
    theme: row.theme,
    locale: row.locale,
    sidebarCollapsed: row.sidebar_collapsed,
    spiritualEnabled: row.spiritual_enabled,
  };
}

export function mapCalendarRow(row: CalendarRow): Calendar {
  return { id: row.id, name: row.name, color: row.color, isDefault: row.is_default };
}

export function mapCalendarEventRow(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    calendarId: row.calendar_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    location: row.location ?? undefined,
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    timezone: row.timezone,
    color: row.color,
    taskId: row.task_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHabitRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon,
    color: row.color,
    category: row.category,
    frequencyType: row.frequency_type,
    frequencyConfig: row.frequency_config ?? {},
    targetCount: row.target_count,
    reminderTime: row.reminder_time ? row.reminder_time.slice(0, 5) : undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapHabitLogRow(row: HabitLogRow): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    logDate: row.log_date,
    completedCount: row.completed_count,
    notes: row.notes ?? undefined,
    completedAt: row.completed_at ?? undefined,
  };
}

export function mapMilestoneRow(row: GoalMilestoneRow): GoalMilestone {
  return {
    id: row.id,
    goalId: row.goal_id,
    title: row.title,
    description: row.description ?? undefined,
    targetDate: row.target_date ?? undefined,
    isCompleted: row.is_completed,
    completedAt: row.completed_at ?? undefined,
    sortOrder: row.sort_order,
  };
}

export function mapGoalRow(row: GoalRow): Goal {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    icon: row.icon,
    color: row.color,
    startDate: row.start_date,
    targetDate: row.target_date ?? undefined,
    priority: row.priority,
    status: row.status,
    manualProgress: row.manual_progress,
    targetValue: row.target_value ?? undefined,
    currentValue: Number(row.current_value ?? 0),
    milestones: row.goal_milestones
      ? [...row.goal_milestones].sort((a, b) => a.sort_order - b.sort_order).map(mapMilestoneRow)
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapFocusPreferencesRow(row: FocusPreferencesRow): FocusPreferences {
  return {
    focusDuration: row.focus_duration,
    shortBreakDuration: row.short_break_duration,
    longBreakDuration: row.long_break_duration,
    sessionsBeforeLongBreak: row.sessions_before_long_break,
    autoStartBreaks: row.auto_start_breaks,
    autoStartFocus: row.auto_start_focus,
    ambientSound: row.ambient_sound,
  };
}

export function mapFocusSessionRow(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    taskId: row.task_id ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    durationSeconds: row.duration_seconds,
    sessionType: row.session_type,
    status: row.status,
    notes: row.notes ?? undefined,
    distractionCount: row.distraction_count,
    createdAt: row.created_at,
  };
}

export function mapAIConversationRow(row: AIConversationRow): AIConversation {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAIMessageRow(row: AIMessageRow): AIMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    proposedActions: row.metadata?.proposedActions,
    createdAt: row.created_at,
  };
}

export function mapSpiritualPreferencesRow(row: SpiritualPreferencesRow): SpiritualPreferences {
  return {
    enabled: row.enabled,
    settings: {
      dailyQuranPages: row.settings?.dailyQuranPages ?? 4,
      prayerMethod: row.settings?.prayerMethod ?? 'unconfigured',
      locationLabel: row.settings?.locationLabel ?? '',
      shareWithAi: row.settings?.shareWithAi ?? false,
    },
  };
}

export function mapSpiritualLogRow(row: SpiritualLogRow): SpiritualLog {
  return {
    id: row.id,
    activityType: row.activity_type,
    activityDate: row.activity_date,
    activityData: row.activity_data ?? {},
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapNotificationPreferencesRow(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    settings: {
      tasks: row.settings?.tasks ?? true,
      calendar: row.settings?.calendar ?? true,
      habits: row.settings?.habits ?? true,
      goals: row.settings?.goals ?? true,
      focus: row.settings?.focus ?? true,
      spiritual: row.settings?.spiritual ?? false,
      summaries: row.settings?.summaries ?? true,
      leadMinutes: row.settings?.leadMinutes ?? 15,
      dailyLimit: row.settings?.dailyLimit ?? 20,
      sound: row.settings?.sound ?? true,
    },
    quietHours: {
      enabled: row.quiet_hours?.enabled ?? false,
      start: row.quiet_hours?.start ?? '22:00',
      end: row.quiet_hours?.end ?? '07:00',
    },
    timezone: row.timezone || 'UTC',
  };
}

export function mapNotificationRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url ?? undefined,
    dedupeKey: row.dedupe_key ?? undefined,
    scheduledAt: row.scheduled_at,
    deliveredAt: row.delivered_at ?? undefined,
    readAt: row.read_at ?? undefined,
    status: row.status,
    createdAt: row.created_at,
  };
}
