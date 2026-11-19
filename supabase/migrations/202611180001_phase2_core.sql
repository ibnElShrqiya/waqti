-- =============================================================================
-- WAQTI — Phase 2 Core Schema, Indexes, Triggers & Row Level Security (RLS)
-- Tables: profiles, user_preferences, task_categories, tasks, subtasks
-- =============================================================================

-- 1. Shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  display_name text not null default '',
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  using (auth.uid() = id);

-- 3. User Preferences (synced across devices)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  locale text not null default 'en' check (locale in ('en', 'ar')),
  sidebar_collapsed boolean not null default false,
  spiritual_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_preferences_delete_own"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

-- 4. Task Categories
create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 64),
  color text not null default '#176B56',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

create index if not exists idx_task_categories_user_id on public.task_categories (user_id);

drop trigger if exists trg_task_categories_updated_at on public.task_categories;
create trigger trg_task_categories_updated_at
  before update on public.task_categories
  for each row execute function public.set_updated_at();

alter table public.task_categories enable row level security;

create policy "task_categories_select_own"
  on public.task_categories for select
  using (auth.uid() = user_id);

create policy "task_categories_insert_own"
  on public.task_categories for insert
  with check (auth.uid() = user_id);

create policy "task_categories_update_own"
  on public.task_categories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "task_categories_delete_own"
  on public.task_categories for delete
  using (auth.uid() = user_id);

-- 5. Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid references public.task_categories (id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  notes text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed', 'deferred')),
  priority text not null default 'medium' check (priority in ('urgent', 'high', 'medium', 'low')),
  tags text[] not null default '{}',
  due_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  recurrence_rule jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_tasks_time_block check (end_at is null or start_at is null or end_at >= start_at)
);

create index if not exists idx_tasks_user_status on public.tasks (user_id, status);
create index if not exists idx_tasks_user_due_at on public.tasks (user_id, due_at);
create index if not exists idx_tasks_user_start_at on public.tasks (user_id, start_at);
create index if not exists idx_tasks_user_category on public.tasks (user_id, category_id);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- 6. Subtasks
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subtasks_task_position on public.subtasks (task_id, position);
create index if not exists idx_subtasks_user_id on public.subtasks (user_id);

drop trigger if exists trg_subtasks_updated_at on public.subtasks;
create trigger trg_subtasks_updated_at
  before update on public.subtasks
  for each row execute function public.set_updated_at();

alter table public.subtasks enable row level security;

create policy "subtasks_select_own"
  on public.subtasks for select
  using (auth.uid() = user_id);

create policy "subtasks_insert_own"
  on public.subtasks for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
  );

create policy "subtasks_update_own"
  on public.subtasks for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id and t.user_id = auth.uid()
    )
  );

create policy "subtasks_delete_own"
  on public.subtasks for delete
  using (auth.uid() = user_id);

-- 7. Automatic profile & preferences provisioning on user sign-up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_first_name text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'User'), '@', 1)
  );
  v_first_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    split_part(v_display_name, ' ', 1)
  );

  insert into public.profiles (id, first_name, display_name)
  values (new.id, v_first_name, v_display_name)
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
