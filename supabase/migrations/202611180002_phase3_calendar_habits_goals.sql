-- =============================================================================
-- WAQTI — Phase 3 Schema, Indexes, Triggers & Row Level Security (RLS)
-- Tables: calendars, calendar_events, habits, habit_logs, goals, goal_milestones
-- Depends on: 202611180001_phase2_core.sql (set_updated_at(), tasks)
-- =============================================================================

-- 1. Calendars
create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default '#176B56',
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_calendars_user_id on public.calendars (user_id);

drop trigger if exists trg_calendars_updated_at on public.calendars;
create trigger trg_calendars_updated_at
  before update on public.calendars
  for each row execute function public.set_updated_at();

alter table public.calendars enable row level security;

create policy "calendars_select_own"
  on public.calendars for select
  using (auth.uid() = user_id);

create policy "calendars_insert_own"
  on public.calendars for insert
  with check (auth.uid() = user_id);

create policy "calendars_update_own"
  on public.calendars for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "calendars_delete_own"
  on public.calendars for delete
  using (auth.uid() = user_id);

-- 2. Calendar Events
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  calendar_id uuid references public.calendars (id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'UTC',
  color text not null default '#2D699B',
  task_id uuid references public.tasks (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_calendar_events_range check (end_at >= start_at)
);

create index if not exists idx_calendar_events_user_range on public.calendar_events (user_id, start_at, end_at);
create index if not exists idx_calendar_events_task_id on public.calendar_events (task_id) where task_id is not null;

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_own"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create policy "calendar_events_insert_own"
  on public.calendar_events for insert
  with check (
    auth.uid() = user_id
    and (
      calendar_id is null
      or exists (
        select 1 from public.calendars c
        where c.id = calendar_id and c.user_id = auth.uid()
      )
    )
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.user_id = auth.uid()
      )
    )
  );

create policy "calendar_events_update_own"
  on public.calendar_events for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      calendar_id is null
      or exists (
        select 1 from public.calendars c
        where c.id = calendar_id and c.user_id = auth.uid()
      )
    )
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.user_id = auth.uid()
      )
    )
  );

create policy "calendar_events_delete_own"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

-- 3. Habits
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  icon text not null default 'leaf',
  color text not null default '#176B56',
  category text not null default 'personal',
  frequency_type text not null default 'daily'
    check (frequency_type in ('daily', 'weekdays', 'weekly_target', 'monthly_target')),
  frequency_config jsonb not null default '{}'::jsonb,
  target_count integer not null default 1 check (target_count >= 1),
  reminder_time time,
  start_date date not null default current_date,
  end_date date,
  is_archived boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_habits_dates check (end_date is null or end_date >= start_date)
);

create index if not exists idx_habits_user_active on public.habits (user_id, is_archived);

drop trigger if exists trg_habits_updated_at on public.habits;
create trigger trg_habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

alter table public.habits enable row level security;

create policy "habits_select_own"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "habits_insert_own"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "habits_update_own"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "habits_delete_own"
  on public.habits for delete
  using (auth.uid() = user_id);

-- 4. Habit Logs
create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  log_date date not null,
  completed_count integer not null default 1 check (completed_count >= 0),
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (habit_id, log_date)
);

create index if not exists idx_habit_logs_user_date on public.habit_logs (user_id, log_date);
create index if not exists idx_habit_logs_habit_date on public.habit_logs (habit_id, log_date);

drop trigger if exists trg_habit_logs_updated_at on public.habit_logs;
create trigger trg_habit_logs_updated_at
  before update on public.habit_logs
  for each row execute function public.set_updated_at();

alter table public.habit_logs enable row level security;

create policy "habit_logs_select_own"
  on public.habit_logs for select
  using (auth.uid() = user_id);

create policy "habit_logs_insert_own"
  on public.habit_logs for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );

create policy "habit_logs_update_own"
  on public.habit_logs for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = auth.uid()
    )
  );

create policy "habit_logs_delete_own"
  on public.habit_logs for delete
  using (auth.uid() = user_id);

-- 5. Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text,
  category text not null default 'personal'
    check (category in ('personal', 'professional', 'educational', 'health', 'financial', 'custom')),
  icon text not null default 'flag',
  color text not null default '#176B56',
  start_date date not null default current_date,
  target_date date,
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'archived')),
  manual_progress integer not null default 0 check (manual_progress between 0 and 100),
  target_value numeric,
  current_value numeric not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_goals_dates check (target_date is null or target_date >= start_date)
);

create index if not exists idx_goals_user_status on public.goals (user_id, status);

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy "goals_select_own"
  on public.goals for select
  using (auth.uid() = user_id);

create policy "goals_insert_own"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "goals_update_own"
  on public.goals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "goals_delete_own"
  on public.goals for delete
  using (auth.uid() = user_id);

-- 6. Goal Milestones
create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text,
  target_date date,
  is_completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_goal_milestones_goal_order on public.goal_milestones (goal_id, sort_order);
create index if not exists idx_goal_milestones_user_id on public.goal_milestones (user_id);

drop trigger if exists trg_goal_milestones_updated_at on public.goal_milestones;
create trigger trg_goal_milestones_updated_at
  before update on public.goal_milestones
  for each row execute function public.set_updated_at();

alter table public.goal_milestones enable row level security;

create policy "goal_milestones_select_own"
  on public.goal_milestones for select
  using (auth.uid() = user_id);

create policy "goal_milestones_insert_own"
  on public.goal_milestones for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create policy "goal_milestones_update_own"
  on public.goal_milestones for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create policy "goal_milestones_delete_own"
  on public.goal_milestones for delete
  using (auth.uid() = user_id);
