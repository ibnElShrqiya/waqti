import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseActive, repositories } from '@/data';
import { supabase } from '@/lib/supabase';
import { usePreferences } from '@/stores/preferences';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSupabaseActive: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseActive);
  const hydratedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseActive || !supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      if (!nextSession) {
        hydratedUserIdRef.current = null;
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  // Hydrate preferences from Supabase when a user signs in.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!isSupabaseActive || !userId || hydratedUserIdRef.current === userId) return;

    hydratedUserIdRef.current = userId;
    repositories.preferences
      .get()
      .then((remote) => {
        usePreferences.setState({
          theme: remote.theme,
          locale: remote.locale,
          sidebarCollapsed: remote.sidebarCollapsed,
          spiritualEnabled: remote.spiritualEnabled,
        });
      })
      .catch(() => {
        // Keep local preferences if initial fetch fails.
      });
  }, [session?.user?.id]);

  // Sync local preference changes back to Supabase while signed in.
  const theme = usePreferences((s) => s.theme);
  const locale = usePreferences((s) => s.locale);
  const sidebarCollapsed = usePreferences((s) => s.sidebarCollapsed);
  const spiritualEnabled = usePreferences((s) => s.spiritualEnabled);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!isSupabaseActive || !userId || hydratedUserIdRef.current !== userId) return;

    const timer = window.setTimeout(() => {
      void repositories.preferences
        .upsert({ theme, locale, sidebarCollapsed, spiritualEnabled })
        .catch(() => {});
    }, 350);

    return () => window.clearTimeout(timer);
  }, [session?.user?.id, theme, locale, sidebarCollapsed, spiritualEnabled]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      isSupabaseActive,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase is not configured.');
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      },
      async signUp(email, password, firstName) {
        if (!supabase) throw new Error('Supabase is not configured.');
        const cleanName = firstName.trim();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              first_name: cleanName,
              display_name: cleanName,
            },
          },
        });
        if (error) throw error;
        return { needsEmailConfirmation: !data.session };
      },
      async signOut() {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        queryClient.clear();
      },
      async resetPasswordForEmail(email) {
        if (!supabase) throw new Error('Supabase is not configured.');
        const redirectTo = `${window.location.origin}/auth/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) throw error;
      },
      async updatePassword(password) {
        if (!supabase) throw new Error('Supabase is not configured.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },
    }),
    [session, loading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
