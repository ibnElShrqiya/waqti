# WAQTI Supabase Database Migrations

## Setup

1. Create a Supabase project at <https://supabase.com>.
2. Copy `.env.example` to `.env.local` and set:
   - `VITE_DATA_SOURCE=supabase`
   - `VITE_SUPABASE_URL=<your-project-url>`
   - `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
   > **Security:** Never expose the `service_role` key in any `VITE_` variable or frontend code.
3. Apply migrations using the Supabase CLI:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   Or run the SQL files in `supabase/migrations/` in order via the Supabase SQL Editor.

## Migrations

- `202611180001_phase2_core.sql`: Creates `profiles`, `user_preferences`, `task_categories`, `tasks`, and `subtasks` with indexes, `updated_at` triggers, strict RLS policies (`auth.uid() = user_id`), and `handle_new_user()` sign-up provisioning.
- `202611180002_phase3_calendar_habits_goals.sql`: Creates `calendars`, `calendar_events`, `habits`, `habit_logs`, `goals`, and `goal_milestones` with indexes, validation constraints, `updated_at` triggers, and strict RLS policies (including cross-table ownership verification for linked tasks, calendars, habits, and goals).
- `202611180003_phase4_focus_ai_spiritual_notifications.sql`: Creates `focus_preferences`, `focus_sessions`, `ai_conversations`, `ai_messages`, `ai_usage`, `spiritual_preferences`, `spiritual_logs`, `notification_preferences`, `notifications`, and `push_subscriptions` with strict RLS policies and deduplication indexes.
- `202611190004_phase5_analytics_offline_freemium_admin.sql`: Adds `profiles.role` with self-escalation guard, `subscription_plans`, `subscriptions`, `sync_operations`, `platform_config`, `audit_logs`, `is_admin()`, `get_effective_plan()`, and admin-protected RPCs (`admin_get_overview`, `admin_list_users`, `admin_update_user_subscription`).
- `202611190005_audit_hardening.sql`: Security hardening (removes client `ai_usage` INSERT policy, enforces ownership check in `get_effective_plan()`, locks `search_path` on `set_updated_at()`, adds `check_user_quota()`).
