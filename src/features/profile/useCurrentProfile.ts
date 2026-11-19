import { useDashboardSnapshot } from '@/features/dashboard/api/useDashboardSnapshot';
import type { DashboardSnapshot, UserProfile } from '@/domain/types';

const selectProfile = (s: DashboardSnapshot) => s.profile;

/**
 * Current user's profile. Phase 1 reads it from the dashboard snapshot;
 * Phase 2 replaces this with the authenticated Supabase profile.
 */
export function useCurrentProfile(): UserProfile | undefined {
  return useDashboardSnapshot(selectProfile).data;
}
