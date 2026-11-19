import type {
  AdminOverview,
  AdminUserRecord,
  AIConversation,
  AIMessage,
  AIProposedAction,
  AuditLogEntry,
  Calendar,
  CalendarEvent,
  DashboardSnapshot,
  DataSourceKind,
  FocusPreferences,
  FocusSession,
  Goal,
  GoalMilestone,
  Habit,
  HabitLog,
  HabitSummary,
  ID,
  NewCalendarEventInput,
  NewFocusSessionInput,
  NewGoalInput,
  NewHabitInput,
  NewMilestoneInput,
  NewTaskInput,
  NotificationItem,
  NotificationPreferences,
  PlatformConfigEntry,
  SpiritualActivityType,
  SpiritualLog,
  SpiritualPreferences,
  SubscriptionPlan,
  SubscriptionPlanId,
  SubscriptionStatus,
  Subtask,
  Task,
  TaskCategory,
  UpdateCalendarEventInput,
  UpdateGoalInput,
  UpdateHabitInput,
  UpdateMilestoneInput,
  UpdateTaskInput,
  UsageSnapshot,
  UserPreferencesRecord,
  UserProfile,
  UserSubscription,
} from '@/domain/types';

/**
 * Repository contracts. UI code depends ONLY on these interfaces — never on a
 * concrete data source.
 */

export interface DashboardRepository {
  getSnapshot(day: Date): Promise<DashboardSnapshot>;
}

export interface TaskRepository {
  list(): Promise<Task[]>;
  create(input: NewTaskInput): Promise<Task>;
  update(id: ID, patch: UpdateTaskInput): Promise<Task>;
  delete(id: ID): Promise<void>;
  setCompleted(id: ID, completed: boolean): Promise<Task>;
  addSubtask(taskId: ID, title: string): Promise<Subtask>;
  toggleSubtask(subtaskId: ID, completed: boolean): Promise<Subtask>;
  deleteSubtask(subtaskId: ID): Promise<void>;
}

export interface CategoryRepository {
  list(): Promise<TaskCategory[]>;
  create(name: string, color: string): Promise<TaskCategory>;
  delete(id: ID): Promise<void>;
}

export interface CalendarRepository {
  listCalendars(): Promise<Calendar[]>;
  createCalendar(name: string, color: string): Promise<Calendar>;
  listEvents(): Promise<CalendarEvent[]>;
  createEvent(input: NewCalendarEventInput): Promise<CalendarEvent>;
  updateEvent(id: ID, patch: UpdateCalendarEventInput): Promise<CalendarEvent>;
  deleteEvent(id: ID): Promise<void>;
}

export interface HabitRepository {
  list(): Promise<Habit[]>;
  listLogs(fromDate?: string, toDate?: string): Promise<HabitLog[]>;
  create(input: NewHabitInput): Promise<Habit>;
  update(id: ID, patch: UpdateHabitInput): Promise<Habit>;
  delete(id: ID): Promise<void>;
  logProgress(habitId: ID, logDate: string, completedCount: number, notes?: string): Promise<HabitLog>;
  setDoneToday(id: ID, done: boolean): Promise<HabitSummary>;
}

export interface GoalRepository {
  list(): Promise<Goal[]>;
  create(input: NewGoalInput): Promise<Goal>;
  update(id: ID, patch: UpdateGoalInput): Promise<Goal>;
  delete(id: ID): Promise<void>;
  addMilestone(input: NewMilestoneInput): Promise<GoalMilestone>;
  updateMilestone(id: ID, patch: UpdateMilestoneInput): Promise<GoalMilestone>;
  deleteMilestone(id: ID): Promise<void>;
  reorderMilestones(goalId: ID, orderedIds: ID[]): Promise<void>;
}

export interface ProfileRepository {
  get(): Promise<UserProfile>;
  update(patch: Partial<Pick<UserProfile, 'firstName' | 'displayName' | 'timezone'>>): Promise<UserProfile>;
}

export interface PreferencesRepository {
  get(): Promise<UserPreferencesRecord>;
  upsert(prefs: UserPreferencesRecord): Promise<UserPreferencesRecord>;
}

export interface FocusRepository {
  getPreferences(): Promise<FocusPreferences>;
  updatePreferences(prefs: FocusPreferences): Promise<FocusPreferences>;
  listSessions(): Promise<FocusSession[]>;
  createSession(input: NewFocusSessionInput): Promise<FocusSession>;
}

export interface AIRepository {
  listConversations(): Promise<AIConversation[]>;
  listMessages(conversationId: ID): Promise<AIMessage[]>;
  deleteConversation(conversationId: ID): Promise<void>;
  sendMessage(params: {
    conversationId?: ID;
    message: string;
    locale: 'en' | 'ar';
    personalizationEnabled: boolean;
    shareSpiritualContext: boolean;
  }): Promise<{ conversationId: ID; reply: string; proposedActions: AIProposedAction[] }>;
  executeAction(action: AIProposedAction): Promise<void>;
}

export interface SpiritualRepository {
  getPreferences(): Promise<SpiritualPreferences>;
  updatePreferences(prefs: SpiritualPreferences): Promise<SpiritualPreferences>;
  listLogs(fromDate?: string, toDate?: string): Promise<SpiritualLog[]>;
  logActivity(params: {
    activityType: SpiritualActivityType;
    activityDate: string;
    activityData: Record<string, unknown>;
    completed?: boolean;
  }): Promise<SpiritualLog>;
}

export interface NotificationRepository {
  getPreferences(): Promise<NotificationPreferences>;
  updatePreferences(prefs: NotificationPreferences): Promise<NotificationPreferences>;
  list(): Promise<NotificationItem[]>;
  markRead(id: ID): Promise<void>;
  markAllRead(): Promise<void>;
  dismiss(id: ID): Promise<void>;
  savePushSubscription(endpoint: string, subscription: PushSubscriptionJSON): Promise<void>;
  removePushSubscription(endpoint: string): Promise<void>;
}

export interface SubscriptionRepository {
  listPlans(): Promise<SubscriptionPlan[]>;
  getCurrent(): Promise<UserSubscription>;
  getUsage(): Promise<UsageSnapshot>;
  requestPlanChange(targetPlan: SubscriptionPlanId): Promise<{ ok: boolean; message: string }>;
  cancelAtPeriodEnd(): Promise<void>;
}

export interface AdminRepository {
  getOverview(): Promise<AdminOverview>;
  listUsers(): Promise<AdminUserRecord[]>;
  updateUserSubscription(userId: ID, planId: SubscriptionPlanId, status: SubscriptionStatus): Promise<void>;
  listConfig(): Promise<PlatformConfigEntry[]>;
  updateConfig(key: string, value: Record<string, unknown>): Promise<void>;
  listAuditLogs(): Promise<AuditLogEntry[]>;
}

export interface Repositories {
  source: DataSourceKind;
  dashboard: DashboardRepository;
  tasks: TaskRepository;
  categories: CategoryRepository;
  calendar: CalendarRepository;
  habits: HabitRepository;
  goals: GoalRepository;
  focus: FocusRepository;
  ai: AIRepository;
  spiritual: SpiritualRepository;
  notifications: NotificationRepository;
  subscriptions: SubscriptionRepository;
  admin: AdminRepository;
  profile: ProfileRepository;
  preferences: PreferencesRepository;
}
