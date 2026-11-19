import { isSupabaseConfigured } from '@/lib/supabase';
import { usePreferences } from '@/stores/preferences';
import { createMockRepositories } from './mock/mockRepositories';
import type { Repositories } from './repositories/types';
import { createSupabaseRepositories } from './supabase/supabaseRepositories';

/**
 * Single composition point for data sources.
 * Uses Supabase when `VITE_DATA_SOURCE=supabase` and credentials are configured;
 * otherwise runs on isolated in-memory demo data.
 */
export const isSupabaseActive =
  import.meta.env.VITE_DATA_SOURCE === 'supabase' && isSupabaseConfigured;

function createRepositories(): Repositories {
  const requested = import.meta.env.VITE_DATA_SOURCE ?? 'mock';
  if (requested === 'supabase') {
    if (isSupabaseConfigured) {
      return createSupabaseRepositories();
    }
    if (import.meta.env.DEV) {
      console.warn(
        '[data] VITE_DATA_SOURCE=supabase, but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing. Falling back to demo data.',
      );
    }
  }
  return createMockRepositories({ getLocale: () => usePreferences.getState().locale });
}

export const repositories: Repositories = createRepositories();

export type { Repositories } from './repositories/types';
