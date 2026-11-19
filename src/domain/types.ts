/**
 * WAQTI domain model (frontend).
 * These shapes are the contract between UI and data sources. They intentionally
 * mirror the planned Supabase tables (see docs/ARCHITECTURE.md) using camelCase.
 * All timestamps are ISO-8601 strings.
 */

export type ID = string;

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'deferred'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const RECURRENCE_FREQUENCIES = ['daily', 'weekly', 'monthly'] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  endDate?: string;
}

export interface Subtask {
  id: ID;
  taskId: ID;
  title: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

export interface TaskCategory {
  id: ID;
  name: string;
  color: string;
}

export interface Task {
  id: ID;
  title: string;
  notes?: string;
  status: TaskStatus;
  priority: Priority;
  categoryId?: ID;
  tags: string[];
  /** Deadline. */
  dueAt?: string;
  /** Scheduled block (time blocking). */
  startAt?: string;
  endAt?: string;
  estimatedMinutes?: number;
  recurrence?: RecurrenceRule;
  subtasks?: Subtask[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewTaskInput {
  title: string;
  notes?: string;
  status?: TaskStatus;
  priority: Priority;
  categoryId?: ID;
  tags?: string[];
  startAt?: string;
  endAt?: string;
  dueAt?: string;
  estimatedMinutes?: number;
  recurrence?: RecurrenceRule;
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  categoryId?: ID | null;
  tags?: string[];
  startAt?: string | null;
  endAt?: string | null;
  dueAt?: string | null;
  estimatedMinutes?: number | null;
  recurrence?: RecurrenceRule | null;
}

/** Non-task items that appear on the daily timeline. */
export type ScheduleEntryKind = 'event' | 'focus' | 'prayer' | 'habit';

export interface ScheduleEntry {
  id: ID;
  kind: ScheduleEntryKind;
  title: string;
  startAt: string;
  endAt?: string;
  done?: boolean;
  /** Spiritual entries are hidden when the user disables Spiritual Life. */
  spiritual?: boolean;
}

export type HabitIcon = 'run' | 'book' | 'water' | 'moon' | 'sun' | 'leaf' | 'pen' | 'heart';

export const HABIT_FREQUENCY_TYPES = ['daily', 'weekdays', 'weekly_target', 'monthly_target'] as const;
export type HabitFrequencyType = (typeof HABIT_FREQUENCY_TYPES)[number];

export interface HabitFrequencyConfig {
  /** 0 = Sunday .. 6 = Saturday, used when frequencyType === 'weekdays'. */
  weekdays?: number[];
  /** Days per week/month target, used for weekly_target / monthly_target. */
  targetDays?: number;
}

export interface Habit {
  id: ID;
  name: string;
  description?: string;
  icon: HabitIcon;
  color: string;
  category: string;
  frequencyType: HabitFrequencyType;
  frequencyConfig: HabitFrequencyConfig;
  targetCount: number;
  reminderTime?: string;
  startDate: string;
  endDate?: string;
  isArchived: boolean;
  spiritual?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: ID;
  habitId: ID;
  logDate: string; // YYYY-MM-DD
  completedCount: number;
  notes?: string;
  completedAt?: string;
}

export interface NewHabitInput {
  name: string;
  description?: string;
  icon: HabitIcon;
  color: string;
  category: string;
  frequencyType: HabitFrequencyType;
  frequencyConfig: HabitFrequencyConfig;
  targetCount: number;
  reminderTime?: string;
  startDate: string;
  endDate?: string;
}

export interface UpdateHabitInput {
  name?: string;
  description?: string | null;
  icon?: HabitIcon;
  color?: string;
  category?: string;
  frequencyType?: HabitFrequencyType;
  frequencyConfig?: HabitFrequencyConfig;
  targetCount?: number;
  reminderTime?: string | null;
  startDate?: string;
  endDate?: string | null;
  isArchived?: boolean;
}

export interface HabitSummary {
  id: ID;
  name: string;
  icon: HabitIcon;
  completedToday: boolean;
  streak: number;
  /** Completion for the last 7 days, oldest first; the last item is today. */
  lastSevenDays: boolean[];
  spiritual?: boolean;
}

export interface Calendar {
  id: ID;
  name: string;
  color: string;
  isDefault: boolean;
}

export interface CalendarEvent {
  id: ID;
  calendarId?: ID;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  color: string;
  taskId?: ID;
  createdAt: string;
  updatedAt: string;
}

export interface NewCalendarEventInput {
  calendarId?: ID;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone?: string;
  color?: string;
  taskId?: ID;
}

export interface UpdateCalendarEventInput {
  calendarId?: ID | null;
  title?: string;
  description?: string | null;
  location?: string | null;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  timezone?: string;
  color?: string;
  taskId?: ID | null;
}

export const GOAL_CATEGORIES = [
  'personal',
  'professional',
  'educational',
  'health',
  'financial',
  'custom',
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_STATUSES = ['active', 'completed', 'paused', 'archived'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface GoalMilestone {
  id: ID;
  goalId: ID;
  title: string;
  description?: string;
  targetDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  sortOrder: number;
}

export interface Goal {
  id: ID;
  title: string;
  description?: string;
  category: GoalCategory;
  icon: string;
  color: string;
  startDate: string;
  targetDate?: string;
  priority: Priority;
  status: GoalStatus;
  manualProgress: number;
  targetValue?: number;
  currentValue: number;
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface NewGoalInput {
  title: string;
  description?: string;
  category: GoalCategory;
  icon?: string;
  color?: string;
  startDate: string;
  targetDate?: string;
  priority: Priority;
  status?: GoalStatus;
  manualProgress?: number;
  targetValue?: number;
  currentValue?: number;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  category?: GoalCategory;
  icon?: string;
  color?: string;
  startDate?: string;
  targetDate?: string | null;
  priority?: Priority;
  status?: GoalStatus;
  manualProgress?: number;
  targetValue?: number | null;
  currentValue?: number;
}

export interface NewMilestoneInput {
  goalId: ID;
  title: string;
  description?: string;
  targetDate?: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string | null;
  targetDate?: string | null;
  isCompleted?: boolean;
  sortOrder?: number;
}

export interface FocusDay {
  date: string;
  minutes: number;
}

export interface FocusSummary {
  todayMinutes: number;
  goalMinutes: number;
  sessionsToday: number;
  streakDays: number;
  /** Last 7 days, oldest first; the last item is today. */
  week: FocusDay[];
}

export type InsightKind = 'suggestion' | 'pattern' | 'celebration' | 'warning';

export interface Insight {
  id: ID;
  kind: InsightKind;
  title: string;
  body: string;
}

export type PlanTier = 'free' | 'premium';
export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: ID;
  firstName: string;
  displayName: string;
  avatarUrl?: string;
  plan: PlanTier;
  role?: UserRole;
  timezone?: string;
  email?: string;
}

export interface UserPreferencesRecord {
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'ar';
  sidebarCollapsed: boolean;
  spiritualEnabled: boolean;
}

export type DataSourceKind = 'mock' | 'supabase';

export interface DashboardSnapshot {
  source: DataSourceKind;
  generatedAt: string;
  profile: UserProfile;
  /** Tasks relevant to the dashboard: today's plan plus upcoming items. */
  tasks: Task[];
  schedule: ScheduleEntry[];
  habits: HabitSummary[];
  goals: Goal[];
  focus: FocusSummary;
  insights: Insight[];
  notifications: NotificationItem[];
  spiritualSummary?: {
    quranPagesToday: number;
    quranDailyTarget: number;
    prayersCompletedToday: number;
    azkarCompletedToday: number;
  };
}

// =============================================================================
// Phase 4 — Focus, Rafiq AI, Spiritual Life & Notifications
// =============================================================================

export type FocusSessionType = 'focus' | 'short_break' | 'long_break';
export type FocusSessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type AmbientSoundKind = 'none' | 'rain' | 'brown';

export interface FocusPreferences {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  ambientSound: AmbientSoundKind;
}

export interface FocusSession {
  id: ID;
  taskId?: ID;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  sessionType: FocusSessionType;
  status: FocusSessionStatus;
  notes?: string;
  distractionCount: number;
  createdAt: string;
}

export interface NewFocusSessionInput {
  taskId?: ID;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  sessionType: FocusSessionType;
  status: FocusSessionStatus;
  notes?: string;
  distractionCount?: number;
}

export type AIProposedActionType =
  | 'create_task'
  | 'update_task_schedule'
  | 'create_event'
  | 'create_habit'
  | 'update_goal';

export interface AIProposedAction {
  id: string;
  type: AIProposedActionType;
  summary: string;
  payload: Record<string, unknown>;
  status?: 'pending' | 'approved' | 'dismissed';
}

export interface AIConversation {
  id: ID;
  title: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: ID;
  conversationId: ID;
  role: 'user' | 'assistant' | 'system';
  content: string;
  proposedActions?: AIProposedAction[];
  createdAt: string;
}

export interface SpiritualSettings {
  dailyQuranPages: number;
  prayerMethod: string;
  locationLabel: string;
  shareWithAi: boolean;
}

export interface SpiritualPreferences {
  enabled: boolean;
  settings: SpiritualSettings;
}

export type SpiritualActivityType = 'quran' | 'azkar' | 'prayer' | 'spiritual_habit';

export interface SpiritualLog {
  id: ID;
  activityType: SpiritualActivityType;
  activityDate: string; // YYYY-MM-DD
  activityData: Record<string, unknown>;
  completedAt?: string;
  createdAt: string;
}

export type NotificationType = 'task' | 'calendar' | 'habit' | 'goal' | 'focus' | 'spiritual' | 'summary';
export type NotificationStatus = 'pending' | 'delivered' | 'read' | 'dismissed';

export interface NotificationItem {
  id: ID;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  dedupeKey?: string;
  scheduledAt: string;
  deliveredAt?: string;
  readAt?: string;
  status: NotificationStatus;
  createdAt: string;
}

export interface NotificationCategorySettings {
  tasks: boolean;
  calendar: boolean;
  habits: boolean;
  goals: boolean;
  focus: boolean;
  spiritual: boolean;
  summaries: boolean;
  leadMinutes: number;
  dailyLimit: number;
  sound: boolean;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface NotificationPreferences {
  settings: NotificationCategorySettings;
  quietHours: QuietHoursConfig;
  timezone: string;
}

// =============================================================================
// Phase 5 — Analytics, Offline Sync, Freemium Subscriptions & Admin
// =============================================================================

export type SubscriptionPlanId = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
export type BillingProvider = 'none' | 'stripe' | 'paddle' | 'manual';

export interface PlanEntitlementFlags {
  advancedAnalytics: boolean;
  exportCsv: boolean;
  rafiqAdvanced: boolean;
  unlimitedHabits: boolean;
  unlimitedGoals: boolean;
}

export interface PlanLimits {
  maxActiveHabits: number;
  maxActiveGoals: number;
  dailyAiRequests: number;
}

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  entitlements: PlanEntitlementFlags;
  limits: PlanLimits;
}

export interface UserSubscription {
  id: ID;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  provider: BillingProvider;
  currentPeriodStart: string;
  currentPeriodEnd?: string;
  gracePeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface UsageSnapshot {
  activeHabits: number;
  activeGoals: number;
  aiRequestsToday: number;
}

export type SyncEntityType = 'task' | 'habit_log' | 'calendar_event' | 'goal_milestone';
export type SyncOperationKind = 'create' | 'update' | 'delete' | 'toggle';
export type SyncOperationStatus = 'pending' | 'syncing' | 'applied' | 'conflict' | 'failed';

export interface OfflineSyncOperation {
  id?: number;
  idempotencyKey: string;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperationKind;
  payload: Record<string, unknown>;
  clientUpdatedAt: string;
  serverUpdatedAt?: string;
  status: SyncOperationStatus;
  retryCount: number;
  nextRetryAt: number;
  lastError?: string;
  createdAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  proUsers: number;
  freeUsers: number;
  totalTasks: number;
  totalHabits: number;
  totalGoals: number;
  aiRequests: number;
  aiEstimatedCost: number;
}

export interface AdminUserRecord {
  id: ID;
  displayName: string;
  role: UserRole;
  plan: SubscriptionPlanId;
  subscriptionStatus: SubscriptionStatus;
  createdAt: string;
}

export interface PlatformConfigEntry {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: ID;
  actorId?: ID;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
