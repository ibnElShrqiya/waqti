import type { Locale } from '@/i18n/types';

/** Centralized TanStack Query keys. */
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    day: (dayKey: string, locale: Locale) => ['dashboard', dayKey, locale] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (locale: Locale) => ['tasks', 'list', locale] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (locale: Locale) => ['categories', 'list', locale] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    calendars: (locale: Locale) => ['calendar', 'calendars', locale] as const,
    events: (locale: Locale) => ['calendar', 'events', locale] as const,
  },
  habits: {
    all: ['habits'] as const,
    list: (locale: Locale) => ['habits', 'list', locale] as const,
    logs: (locale: Locale) => ['habits', 'logs', locale] as const,
  },
  goals: {
    all: ['goals'] as const,
    list: (locale: Locale) => ['goals', 'list', locale] as const,
  },
  focus: {
    all: ['focus'] as const,
    preferences: () => ['focus', 'preferences'] as const,
    sessions: () => ['focus', 'sessions'] as const,
  },
  ai: {
    all: ['ai'] as const,
    conversations: () => ['ai', 'conversations'] as const,
    messages: (conversationId: string) => ['ai', 'messages', conversationId] as const,
  },
  spiritual: {
    all: ['spiritual'] as const,
    preferences: () => ['spiritual', 'preferences'] as const,
    logs: () => ['spiritual', 'logs'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    preferences: () => ['notifications', 'preferences'] as const,
    list: (locale: Locale) => ['notifications', 'list', locale] as const,
  },
  subscriptions: {
    all: ['subscriptions'] as const,
    plans: () => ['subscriptions', 'plans'] as const,
    current: () => ['subscriptions', 'current'] as const,
    usage: () => ['subscriptions', 'usage'] as const,
  },
  admin: {
    all: ['admin'] as const,
    overview: () => ['admin', 'overview'] as const,
    users: () => ['admin', 'users'] as const,
    config: () => ['admin', 'config'] as const,
    auditLogs: () => ['admin', 'auditLogs'] as const,
  },
  profile: {
    all: ['profile'] as const,
  },
};
