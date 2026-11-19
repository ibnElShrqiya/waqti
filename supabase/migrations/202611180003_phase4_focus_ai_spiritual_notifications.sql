-- =============================================================================
-- WAQTI — Phase 4 Schema, Indexes, Triggers & Row Level Security (RLS)
-- Tables: focus_preferences, focus_sessions, ai_conversations, ai_messages,
--         ai_usage, spiritual_preferences, spiritual_logs,
--         notification_preferences, notifications, push_subscriptions
-- Depends on: 202611180001_phase2_core.sql (set_updated_at(), tasks)
-- =============================================================================

-- 1. Focus Preferences
create table if not exists public.focus_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  focus_duration integer not null default 25 check (focus_duration between 1 and 180),
  short_break_duration integer not null default 5 check (short_break_duration between 1 and 60),
  long_break_duration integer not null default 15 check (long_break_duration between 1 and 90),
  sessions_before_long_break integer not null default 4 check (sessions_before_long_break between 1 and 12),
  auto_start_breaks boolean not null default false,
  auto_start_focus boolean not null default false,
  ambient_sound text not null default 'none' check (ambient_sound in ('none', 'rain', 'brown')),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_focus_preferences_updated_at on public.focus_preferences;
create trigger trg_focus_preferences_updated_at
  before update on public.focus_preferences
  for each row execute function public.set_updated_at();

alter table public.focus_preferences enable row level security;

create policy "focus_preferences_select_own"
  on public.focus_preferences for select using (auth.uid() = user_id);
create policy "focus_preferences_insert_own"
  on public.focus_preferences for insert with check (auth.uid() = user_id);
create policy "focus_preferences_update_own"
  on public.focus_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "focus_preferences_delete_own"
  on public.focus_preferences for delete using (auth.uid() = user_id);

-- 2. Focus Sessions
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  session_type text not null default 'focus' check (session_type in ('focus', 'short_break', 'long_break')),
  status text not null default 'completed' check (status in ('in_progress', 'completed', 'abandoned')),
  notes text,
  distraction_count integer not null default 0 check (distraction_count >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_focus_sessions_user_started on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions_select_own"
  on public.focus_sessions for select using (auth.uid() = user_id);
create policy "focus_sessions_insert_own"
  on public.focus_sessions for insert
  with check (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    )
  );
create policy "focus_sessions_update_own"
  on public.focus_sessions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      task_id is null
      or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    )
  );
create policy "focus_sessions_delete_own"
  on public.focus_sessions for delete using (auth.uid() = user_id);

-- 3. AI Conversations
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation' check (char_length(trim(title)) between 1 and 200),
  provider text not null default 'configured',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_conversations_user_updated on public.ai_conversations (user_id, updated_at desc);

drop trigger if exists trg_ai_conversations_updated_at on public.ai_conversations;
create trigger trg_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

alter table public.ai_conversations enable row level security;

create policy "ai_conversations_select_own"
  on public.ai_conversations for select using (auth.uid() = user_id);
create policy "ai_conversations_insert_own"
  on public.ai_conversations for insert with check (auth.uid() = user_id);
create policy "ai_conversations_update_own"
  on public.ai_conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_conversations_delete_own"
  on public.ai_conversations for delete using (auth.uid() = user_id);

-- 4. AI Messages
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_messages_conv_created on public.ai_messages (conversation_id, created_at asc);

alter table public.ai_messages enable row level security;

create policy "ai_messages_select_own"
  on public.ai_messages for select using (auth.uid() = user_id);
create policy "ai_messages_insert_own"
  on public.ai_messages for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
create policy "ai_messages_delete_own"
  on public.ai_messages for delete using (auth.uid() = user_id);

-- 5. AI Usage (read-only to owner; written by server-side Edge Functions)
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost numeric(12, 6) not null default 0 check (estimated_cost >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_ai_usage_user_created on public.ai_usage (user_id, created_at desc);

alter table public.ai_usage enable row level security;

create policy "ai_usage_select_own"
  on public.ai_usage for select using (auth.uid() = user_id);
create policy "ai_usage_insert_own"
  on public.ai_usage for insert with check (auth.uid() = user_id);

-- 6. Spiritual Preferences (strictly private & optional)
create table if not exists public.spiritual_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  settings jsonb not null default '{"dailyQuranPages":4,"prayerMethod":"unconfigured","locationLabel":"","shareWithAi":false}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_spiritual_preferences_updated_at on public.spiritual_preferences;
create trigger trg_spiritual_preferences_updated_at
  before update on public.spiritual_preferences
  for each row execute function public.set_updated_at();

alter table public.spiritual_preferences enable row level security;

create policy "spiritual_preferences_select_own"
  on public.spiritual_preferences for select using (auth.uid() = user_id);
create policy "spiritual_preferences_insert_own"
  on public.spiritual_preferences for insert with check (auth.uid() = user_id);
create policy "spiritual_preferences_update_own"
  on public.spiritual_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "spiritual_preferences_delete_own"
  on public.spiritual_preferences for delete using (auth.uid() = user_id);

-- 7. Spiritual Logs (strictly private)
create table if not exists public.spiritual_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_type text not null check (activity_type in ('quran', 'azkar', 'prayer', 'spiritual_habit')),
  activity_date date not null default current_date,
  activity_data jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_spiritual_logs_user_date on public.spiritual_logs (user_id, activity_date desc);

alter table public.spiritual_logs enable row level security;

create policy "spiritual_logs_select_own"
  on public.spiritual_logs for select using (auth.uid() = user_id);
create policy "spiritual_logs_insert_own"
  on public.spiritual_logs for insert with check (auth.uid() = user_id);
create policy "spiritual_logs_update_own"
  on public.spiritual_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "spiritual_logs_delete_own"
  on public.spiritual_logs for delete using (auth.uid() = user_id);

-- 8. Notification Preferences
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  settings jsonb not null default '{"tasks":true,"calendar":true,"habits":true,"goals":true,"focus":true,"spiritual":false,"summaries":true,"leadMinutes":15,"dailyLimit":20,"sound":true}'::jsonb,
  quiet_hours jsonb not null default '{"enabled":false,"start":"22:00","end":"07:00"}'::jsonb,
  timezone text not null default 'UTC',
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select_own"
  on public.notification_preferences for select using (auth.uid() = user_id);
create policy "notification_preferences_insert_own"
  on public.notification_preferences for insert with check (auth.uid() = user_id);
create policy "notification_preferences_update_own"
  on public.notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification_preferences_delete_own"
  on public.notification_preferences for delete using (auth.uid() = user_id);

-- 9. Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('task', 'calendar', 'habit', 'goal', 'focus', 'spiritual', 'summary')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  body text not null default '',
  action_url text,
  dedupe_key text,
  scheduled_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz,
  read_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'read', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_notifications_user_scheduled on public.notifications (user_id, scheduled_at desc);
create unique index if not exists idx_notifications_user_dedupe
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own"
  on public.notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own"
  on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own"
  on public.notifications for delete using (auth.uid() = user_id);

-- 10. Push Subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, endpoint)
);

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete using (auth.uid() = user_id);
