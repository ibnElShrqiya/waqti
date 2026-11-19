/**
 * ⚠️ MOCK DATA — Phase 1 only.
 *
 * Realistic, localized sample data generated relative to "today" so the UI can
 * be designed and tested before the backend exists. Nothing here is real user
 * data, and the UI labels it as "Demo data" whenever it is displayed.
 * Delete this folder once the Supabase repositories are the default.
 */
import type { Locale } from '@/i18n/types';
import { addDays, atTime, toDayKey } from '@/lib/date';
import { DEFAULT_FOCUS_PREFERENCES } from '@/domain/focus';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/domain/notifications';
import { DEFAULT_SPIRITUAL_PREFERENCES } from '@/domain/spiritual';
import type {
  AdminUserRecord,
  AuditLogEntry,
  Calendar,
  FocusPreferences,
  FocusSession,
  FocusSummary,
  GoalCategory,
  GoalMilestone,
  GoalStatus,
  HabitFrequencyConfig,
  HabitFrequencyType,
  HabitIcon,
  HabitLog,
  InsightKind,
  NotificationItem,
  NotificationPreferences,
  PlatformConfigEntry,
  Priority,
  RecurrenceRule,
  ScheduleEntryKind,
  SpiritualLog,
  SpiritualPreferences,
  Subtask,
  TaskStatus,
  UserSubscription,
} from '@/domain/types';

export type Localized = Record<Locale, string>;
export type MaybeLocalized = Localized | string;

export interface MockCategory {
  id: string;
  name: MaybeLocalized;
  color: string;
}

export interface MockTask {
  id: string;
  title: MaybeLocalized;
  status: TaskStatus;
  priority: Priority;
  categoryId?: string;
  tags: string[];
  startAt?: string;
  endAt?: string;
  dueAt?: string;
  estimatedMinutes?: number;
  notes?: string;
  recurrence?: RecurrenceRule;
  subtasks?: Subtask[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockEntry {
  id: string;
  kind: ScheduleEntryKind;
  title: Localized;
  startAt: string;
  endAt?: string;
  spiritual?: boolean;
}

export interface MockHabit {
  id: string;
  name: MaybeLocalized;
  description?: MaybeLocalized;
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
  /** Streak up to and including yesterday. */
  baseStreak: number;
  /** Six previous days, oldest first. */
  history: boolean[];
  completedToday: boolean;
  spiritual?: boolean;
}

export interface MockEvent {
  id: string;
  calendarId?: string;
  title: MaybeLocalized;
  description?: MaybeLocalized;
  location?: MaybeLocalized;
  startAt: string;
  endAt: string;
  allDay: boolean;
  timezone: string;
  color: string;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockGoal {
  id: string;
  title: MaybeLocalized;
  description?: MaybeLocalized;
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

export interface MockInsight {
  id: string;
  kind: InsightKind;
  title: Localized;
  body: Localized;
}

export interface MockState {
  dayKey: string;
  firstName: Localized;
  displayName: Localized;
  categories: MockCategory[];
  calendars: Calendar[];
  events: MockEvent[];
  tasks: MockTask[];
  entries: MockEntry[];
  habits: MockHabit[];
  habitLogs: HabitLog[];
  goals: MockGoal[];
  focusPreferences: FocusPreferences;
  focusSessions: FocusSession[];
  spiritualPreferences: SpiritualPreferences;
  spiritualLogs: SpiritualLog[];
  notificationPreferences: NotificationPreferences;
  notifications: NotificationItem[];
  subscription: UserSubscription;
  adminUsers: AdminUserRecord[];
  platformConfig: PlatformConfigEntry[];
  auditLogs: AuditLogEntry[];
  focus: FocusSummary;
  insights: MockInsight[];
}

export function seedMockState(today: Date): MockState {
  const at = (h: number, m = 0, dayOffset = 0) => atTime(addDays(today, dayOffset), h, m).toISOString();
  const created = at(7, 45, -1);

  const categories: MockCategory[] = [
    { id: 'cat-work', name: { en: 'Work', ar: 'العمل' }, color: '#176B56' },
    { id: 'cat-learning', name: { en: 'Learning', ar: 'التعلّم' }, color: '#2D699B' },
    { id: 'cat-personal', name: { en: 'Personal', ar: 'شخصي' }, color: '#D1AD70' },
  ];

  const task = (
    id: string,
    title: Localized,
    priority: Priority,
    status: TaskStatus,
    times: Partial<Pick<MockTask, 'startAt' | 'endAt' | 'dueAt' | 'estimatedMinutes' | 'categoryId' | 'recurrence' | 'subtasks'>>,
    tags: string[] = [],
  ): MockTask => ({
    id,
    title,
    priority,
    status,
    tags,
    ...times,
    completedAt: status === 'completed' ? (times.endAt ?? times.dueAt) : undefined,
    createdAt: created,
    updatedAt: created,
  });

  const tasks: MockTask[] = [
    task('t1', { en: 'Plan the week’s sprint', ar: 'تخطيط مهام الأسبوع' }, 'high', 'completed', {
      startAt: at(8, 30), endAt: at(9, 0), estimatedMinutes: 30,
    }, ['work']),
    task('t6', { en: 'Reply to client emails', ar: 'الرد على رسائل العملاء' }, 'high', 'completed', {
      dueAt: at(12, 0), estimatedMinutes: 20,
    }, ['work']),
    task('t2', { en: 'Review pull requests', ar: 'مراجعة طلبات الدمج' }, 'medium', 'completed', {
      startAt: at(13, 0), endAt: at(14, 30), estimatedMinutes: 90,
    }, ['work']),
    task('t3', { en: 'Write the project proposal', ar: 'كتابة مقترح المشروع' }, 'urgent', 'in_progress', {
      startAt: at(16, 0),
      endAt: at(17, 0),
      dueAt: at(18, 0),
      estimatedMinutes: 60,
      categoryId: 'cat-work',
      subtasks: [
        { id: 'st-1', taskId: 't3', title: 'Outline executive summary', completed: true, position: 0, createdAt: created },
        { id: 'st-2', taskId: 't3', title: 'Finalize timeline & budget', completed: false, position: 1, createdAt: created },
      ],
    }, ['work']),
    task('t7', { en: 'Pay the electricity bill', ar: 'سداد فاتورة الكهرباء' }, 'medium', 'todo', {
      dueAt: at(18, 0), estimatedMinutes: 10, categoryId: 'cat-personal',
      recurrence: { frequency: 'monthly', interval: 1 },
    }, ['home']),
    task('t4', { en: 'Study TypeScript generics', ar: 'دراسة الأنواع العامة في TypeScript' }, 'medium', 'todo', {
      startAt: at(19, 0), endAt: at(20, 0), estimatedMinutes: 60, categoryId: 'cat-learning',
    }, ['learning']),
    task('t5', { en: 'Evening review & plan tomorrow', ar: 'مراجعة اليوم وتخطيط الغد' }, 'low', 'todo', {
      startAt: at(21, 30), endAt: at(21, 45), estimatedMinutes: 15, categoryId: 'cat-personal',
      recurrence: { frequency: 'daily', interval: 1 },
    }, ['personal']),
    task('t8', { en: 'Prepare presentation slides', ar: 'تجهيز شرائح العرض التقديمي' }, 'high', 'todo', {
      dueAt: at(10, 0, 1), estimatedMinutes: 90,
    }, ['work']),
    task('t9', { en: 'Book a dentist appointment', ar: 'حجز موعد عند طبيب الأسنان' }, 'low', 'todo', {
      dueAt: at(12, 0, 2), estimatedMinutes: 10,
    }, ['health']),
    task('t10', { en: 'Submit the monthly report', ar: 'تسليم التقرير الشهري' }, 'urgent', 'todo', {
      dueAt: at(17, 0, 3), estimatedMinutes: 120,
    }, ['work']),
    task('t11', { en: 'Grocery shopping', ar: 'التسوق للمنزل' }, 'low', 'deferred', {
      dueAt: at(18, 0, 1),
    }, ['home']),
  ];

  const entries: MockEntry[] = [
    { id: 'fajr', kind: 'prayer', title: { en: 'Fajr', ar: 'الفجر' }, startAt: at(5, 12), spiritual: true },
    { id: 'run', kind: 'habit', title: { en: 'Morning run', ar: 'جري الصباح' }, startAt: at(6, 30), endAt: at(7, 0) },
    { id: 'deep1', kind: 'focus', title: { en: 'Deep work · API design', ar: 'عمل عميق · تصميم الواجهات البرمجية' }, startAt: at(9, 0), endAt: at(10, 30) },
    { id: 'sync', kind: 'event', title: { en: 'Team sync', ar: 'اجتماع الفريق' }, startAt: at(11, 0), endAt: at(11, 30) },
    { id: 'dhuhr', kind: 'prayer', title: { en: 'Dhuhr', ar: 'الظهر' }, startAt: at(12, 8), spiritual: true },
    { id: 'asr', kind: 'prayer', title: { en: 'Asr', ar: 'العصر' }, startAt: at(15, 14), spiritual: true },
    { id: 'client', kind: 'event', title: { en: 'Client call', ar: 'مكالمة مع العميل' }, startAt: at(15, 30), endAt: at(15, 55) },
    { id: 'maghrib', kind: 'prayer', title: { en: 'Maghrib', ar: 'المغرب' }, startAt: at(17, 36), spiritual: true },
    { id: 'isha', kind: 'prayer', title: { en: 'Isha', ar: 'العشاء' }, startAt: at(18, 52), spiritual: true },
    { id: 'quran', kind: 'habit', title: { en: 'Daily Quran reading', ar: 'الورد اليومي من القرآن' }, startAt: at(20, 15), endAt: at(20, 35), spiritual: true },
  ];

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const calendars: Calendar[] = [
    { id: 'cal-personal', name: 'Personal', color: '#176B56', isDefault: true },
    { id: 'cal-work', name: 'Work', color: '#2D699B', isDefault: false },
  ];

  const events: MockEvent[] = [
    {
      id: 'ev-sync',
      calendarId: 'cal-work',
      title: { en: 'Team sync', ar: 'اجتماع الفريق' },
      location: { en: 'Zoom', ar: 'اجتماع مرئي' },
      startAt: at(11, 0),
      endAt: at(11, 30),
      allDay: false,
      timezone: tz,
      color: '#2D699B',
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'ev-client',
      calendarId: 'cal-work',
      title: { en: 'Client call', ar: 'مكالمة مع العميل' },
      startAt: at(15, 30),
      endAt: at(16, 15),
      allDay: false,
      timezone: tz,
      color: '#D1AD70',
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'ev-review',
      calendarId: 'cal-personal',
      title: { en: 'Weekly planning session', ar: 'جلسة التخطيط الأسبوعي' },
      startAt: at(10, 0, 1),
      endAt: at(11, 0, 1),
      allDay: false,
      timezone: tz,
      color: '#176B56',
      createdAt: created,
      updatedAt: created,
    },
  ];

  const startMonth = toDayKey(addDays(today, -30));
  const habits: MockHabit[] = [
    {
      id: 'h1',
      name: { en: 'Morning run', ar: 'جري الصباح' },
      description: { en: '20 minutes outdoors', ar: '٢٠ دقيقة في الهواء الطلق' },
      icon: 'run',
      color: '#176B56',
      category: 'health',
      frequencyType: 'daily',
      frequencyConfig: {},
      targetCount: 1,
      reminderTime: '06:30',
      startDate: startMonth,
      isArchived: false,
      baseStreak: 11,
      history: [true, false, true, true, true, true],
      completedToday: true,
    },
    {
      id: 'h2',
      name: { en: 'Read 20 pages', ar: 'قراءة ٢٠ صفحة' },
      icon: 'book',
      color: '#2D699B',
      category: 'learning',
      frequencyType: 'weekly_target',
      frequencyConfig: { targetDays: 5 },
      targetCount: 1,
      startDate: startMonth,
      isArchived: false,
      baseStreak: 5,
      history: [false, true, true, true, true, true],
      completedToday: false,
    },
    {
      id: 'h3',
      name: { en: 'Drink 8 glasses of water', ar: 'شرب ٨ أكواب ماء' },
      icon: 'water',
      color: '#2D699B',
      category: 'health',
      frequencyType: 'daily',
      frequencyConfig: {},
      targetCount: 8,
      startDate: startMonth,
      isArchived: false,
      baseStreak: 3,
      history: [true, false, false, true, true, true],
      completedToday: false,
    },
    {
      id: 'h4',
      name: { en: 'Daily Quran reading', ar: 'الورد اليومي من القرآن' },
      icon: 'moon',
      color: '#D1AD70',
      category: 'spiritual',
      frequencyType: 'daily',
      frequencyConfig: {},
      targetCount: 1,
      startDate: startMonth,
      isArchived: false,
      baseStreak: 21,
      history: [true, true, true, true, true, true],
      completedToday: false,
      spiritual: true,
    },
    {
      id: 'h5',
      name: { en: 'Morning adhkar', ar: 'أذكار الصباح' },
      icon: 'sun',
      color: '#D1AD70',
      category: 'spiritual',
      frequencyType: 'daily',
      frequencyConfig: {},
      targetCount: 1,
      startDate: startMonth,
      isArchived: false,
      baseStreak: 29,
      history: [true, true, true, true, true, true],
      completedToday: true,
      spiritual: true,
    },
  ];

  const habitLogs: HabitLog[] = [];
  for (const h of habits) {
    h.history.forEach((done, idx) => {
      if (done) {
        const dKey = toDayKey(addDays(today, idx - 6));
        habitLogs.push({
          id: `hl-${h.id}-${idx}`,
          habitId: h.id,
          logDate: dKey,
          completedCount: h.targetCount,
          completedAt: created,
        });
      }
    });
    if (h.completedToday) {
      habitLogs.push({
        id: `hl-${h.id}-today`,
        habitId: h.id,
        logDate: toDayKey(today),
        completedCount: h.targetCount,
        completedAt: created,
      });
    } else if (h.id === 'h3') {
      habitLogs.push({
        id: 'hl-h3-today',
        habitId: 'h3',
        logDate: toDayKey(today),
        completedCount: 5,
      });
    }
  }

  const goals: MockGoal[] = [
    {
      id: 'g1',
      title: { en: 'Launch WAQTI SaaS v1', ar: 'إطلاق منصة وقتي الإصدار الأول' },
      description: {
        en: 'Ship core productivity workflows with rock-solid security and UX.',
        ar: 'إطلاق مسارات الإنتاجية الأساسية بأعلى معايير الأمان وتجربة المستخدم.',
      },
      category: 'professional',
      icon: 'flag',
      color: '#176B56',
      startDate: toDayKey(addDays(today, -14)),
      targetDate: toDayKey(addDays(today, 20)),
      priority: 'high',
      status: 'active',
      manualProgress: 0,
      currentValue: 0,
      milestones: [
        {
          id: 'gm-1',
          goalId: 'g1',
          title: 'Design system & Dashboard',
          isCompleted: true,
          completedAt: created,
          sortOrder: 0,
        },
        {
          id: 'gm-2',
          goalId: 'g1',
          title: 'Auth, Database & Tasks',
          isCompleted: true,
          completedAt: created,
          sortOrder: 1,
        },
        {
          id: 'gm-3',
          goalId: 'g1',
          title: 'Calendar, Habits & Goals',
          isCompleted: false,
          targetDate: toDayKey(addDays(today, 5)),
          sortOrder: 2,
        },
        {
          id: 'gm-4',
          goalId: 'g1',
          title: 'Rafiq AI & Offline PWA',
          isCompleted: false,
          targetDate: toDayKey(addDays(today, 18)),
          sortOrder: 3,
        },
      ],
      createdAt: created,
      updatedAt: created,
    },
    {
      id: 'g2',
      title: { en: 'Read 12 books this year', ar: 'قراءة ١٢ كتابًا هذا العام' },
      category: 'educational',
      icon: 'book',
      color: '#2D699B',
      startDate: toDayKey(addDays(today, -60)),
      targetDate: toDayKey(addDays(today, 42)),
      priority: 'medium',
      status: 'active',
      manualProgress: 0,
      targetValue: 12,
      currentValue: 9,
      milestones: [],
      createdAt: created,
      updatedAt: created,
    },
  ];

  const weekMinutes = [95, 120, 45, 150, 80, 110, 105];
  const focus: FocusSummary = {
    todayMinutes: 105,
    goalMinutes: 120,
    sessionsToday: 3,
    streakDays: 6,
    week: weekMinutes.map((minutes, i) => ({ date: toDayKey(addDays(today, i - 6)), minutes })),
  };

  const insights: MockInsight[] = [
    {
      id: 'i1',
      kind: 'warning',
      title: { en: 'The proposal is due today', ar: 'موعد تسليم المقترح اليوم' },
      body: {
        en: '“Write the project proposal” is urgent. Protect your 4 PM block and silence notifications for that hour.',
        ar: '«كتابة مقترح المشروع» مهمة عاجلة. احجز فترة الرابعة عصرًا وأوقف الإشعارات خلالها.',
      },
    },
    {
      id: 'i2',
      kind: 'pattern',
      title: { en: 'You focus best before noon', ar: 'تركيزك أعلى قبل الظهر' },
      body: {
        en: 'Your morning sessions run about 40% longer. Try scheduling demanding work before 11 AM.',
        ar: 'جلساتك الصباحية أطول بنحو ٤٠٪. جرّب جدولة الأعمال الصعبة قبل الحادية عشرة صباحًا.',
      },
    },
    {
      id: 'i3',
      kind: 'celebration',
      title: { en: '12 days of running', ar: '١٢ يومًا من الجري' },
      body: {
        en: 'Consistency beats intensity. A lighter session still counts if you need rest.',
        ar: 'الاستمرارية أهم من الشدة. الجلسة الخفيفة تُحتسب أيضًا إن احتجت إلى الراحة.',
      },
    },
  ];

  const focusSessions: FocusSession[] = [
    {
      id: 'fs-1',
      taskId: 't1',
      startedAt: at(9, 0),
      endedAt: at(9, 25),
      durationSeconds: 25 * 60,
      sessionType: 'focus',
      status: 'completed',
      notes: 'Sprint planning deep block',
      distractionCount: 0,
      createdAt: at(9, 0),
    },
    {
      id: 'fs-2',
      taskId: 't2',
      startedAt: at(13, 0),
      endedAt: at(13, 50),
      durationSeconds: 50 * 60,
      sessionType: 'focus',
      status: 'completed',
      distractionCount: 1,
      createdAt: at(13, 0),
    },
    {
      id: 'fs-3',
      taskId: 't3',
      startedAt: at(14, 10),
      endedAt: at(14, 40),
      durationSeconds: 30 * 60,
      sessionType: 'focus',
      status: 'completed',
      distractionCount: 0,
      createdAt: at(14, 10),
    },
  ];

  const todayKey = toDayKey(today);
  const spiritualLogs: SpiritualLog[] = [
    {
      id: 'sl-1',
      activityType: 'quran',
      activityDate: todayKey,
      activityData: { pages: 2, surah: 'Al-Kahf' },
      completedAt: at(6, 0),
      createdAt: at(6, 0),
    },
    {
      id: 'sl-2',
      activityType: 'prayer',
      activityDate: todayKey,
      activityData: { prayer: 'fajr', completed: true },
      completedAt: at(5, 20),
      createdAt: at(5, 20),
    },
    {
      id: 'sl-3',
      activityType: 'prayer',
      activityDate: todayKey,
      activityData: { prayer: 'dhuhr', completed: true },
      completedAt: at(12, 20),
      createdAt: at(12, 20),
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'n-1',
      type: 'task',
      title: 'Write the project proposal',
      body: 'Due today at 6:00 PM',
      actionUrl: '/tasks',
      dedupeKey: 'task:t3',
      scheduledAt: at(15, 45),
      deliveredAt: at(15, 45),
      status: 'delivered',
      createdAt: at(15, 45),
    },
    {
      id: 'n-2',
      type: 'habit',
      title: 'Read 20 pages',
      body: 'Scheduled for today',
      actionUrl: '/habits',
      dedupeKey: 'habit:h2',
      scheduledAt: at(19, 30),
      status: 'pending',
      createdAt: at(19, 30),
    },
  ];

  const subscription: UserSubscription = {
    id: 'sub-demo',
    planId: 'free',
    status: 'active',
    provider: 'manual',
    currentPeriodStart: created,
    cancelAtPeriodEnd: false,
  };

  const adminUsers: AdminUserRecord[] = [
    {
      id: 'demo-user',
      displayName: 'Sara',
      role: 'admin',
      plan: 'free',
      subscriptionStatus: 'active',
      createdAt: created,
    },
    {
      id: 'demo-user-2',
      displayName: 'Omar K.',
      role: 'user',
      plan: 'pro',
      subscriptionStatus: 'active',
      createdAt: created,
    },
  ];

  const platformConfig: PlatformConfigEntry[] = [
    { key: 'maintenance_mode', value: { enabled: false }, updatedAt: created },
    { key: 'ai_enabled', value: { enabled: true }, updatedAt: created },
    { key: 'allow_signups', value: { enabled: true }, updatedAt: created },
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: 'al-1',
      actorId: 'demo-user',
      action: 'platform_initialized',
      targetType: 'system',
      metadata: { environment: 'demo' },
      createdAt: created,
    },
  ];

  return {
    dayKey: toDayKey(today),
    firstName: { en: 'Sara', ar: 'سارة' },
    displayName: { en: 'Sara', ar: 'سارة' },
    categories,
    calendars,
    events,
    tasks,
    entries,
    habits,
    habitLogs,
    goals,
    focusPreferences: DEFAULT_FOCUS_PREFERENCES,
    focusSessions,
    spiritualPreferences: DEFAULT_SPIRITUAL_PREFERENCES,
    spiritualLogs,
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    notifications,
    subscription,
    adminUsers,
    platformConfig,
    auditLogs,
    focus,
    insights,
  };
}
