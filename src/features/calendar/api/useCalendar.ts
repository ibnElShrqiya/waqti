import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { repositories } from '@/data';
import { queryKeys } from '@/data/queryKeys';
import type { NewCalendarEventInput, UpdateCalendarEventInput, UpdateTaskInput } from '@/domain/types';
import { usePreferences } from '@/stores/preferences';

export function useCalendarsList() {
  const locale = usePreferences((s) => s.locale);
  return useQuery({
    queryKey: queryKeys.calendar.calendars(locale),
    queryFn: () => repositories.calendar.listCalendars(),
    staleTime: 60_000,
  });
}

export function useCalendarEvents() {
  const locale = usePreferences((s) => s.locale);
  return useQuery({
    queryKey: queryKeys.calendar.events(locale),
    queryFn: () => repositories.calendar.listEvents(),
    staleTime: 30_000,
  });
}

export function useCalendarMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    void qc.invalidateQueries({ queryKey: queryKeys.tasks.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const createCalendar = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      repositories.calendar.createCalendar(name, color),
    onSuccess: invalidateAll,
  });

  const createEvent = useMutation({
    mutationFn: (input: NewCalendarEventInput) => repositories.calendar.createEvent(input),
    onSuccess: invalidateAll,
  });

  const updateEvent = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCalendarEventInput }) =>
      repositories.calendar.updateEvent(id, patch),
    onSuccess: invalidateAll,
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) => repositories.calendar.deleteEvent(id),
    onSuccess: invalidateAll,
  });

  const scheduleTask = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskInput }) =>
      repositories.tasks.update(id, patch),
    onSuccess: invalidateAll,
  });

  return {
    createCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    scheduleTask,
  };
}
