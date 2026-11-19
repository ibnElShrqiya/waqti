-- =============================================================================
-- WAQTI — Phase 5 Schema, Entitlements, Offline Sync, Subscriptions & Admin
-- Tables: subscription_plans, subscriptions, sync_operations,
--         platform_config, audit_logs
-- Alters: profiles (adds role column + self-escalation guard)
-- =============================================================================

-- 1. Add role column to profiles and prevent non-admins from escalating role/plan
alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.guard_profile_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.plan is distinct from old.plan) then
    if current_setting('role', true) <> 'service_role' and not public.is_admin() then
      raise exception 'Only administrators or server-side billing can modify role or plan'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_sensitive on public.profiles;
create trigger trg_guard_profile_sensitive
  before update on public.profiles
  for each row execute function public.guard_profile_sensitive_columns();

-- 2. Subscription Plans Catalog
create table if not exists public.subscription_plans (
  id text primary key check (id in ('free', 'pro')),
  name text not null,
  description text not null default '',
  price_monthly_cents integer not null default 0 check (price_monthly_cents >= 0),
  price_yearly_cents integer not null default 0 check (price_yearly_cents >= 0),
  entitlements jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_subscription_plans_updated_at on public.subscription_plans;
create trigger trg_subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;

create policy "subscription_plans_read_all"
  on public.subscription_plans for select
  using (true);

create policy "subscription_plans_admin_write"
  on public.subscription_plans for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.subscription_plans (id, name, description, price_monthly_cents, price_yearly_cents, entitlements, limits)
values
  (
    'free',
    'Free',
    'Core task management, basic calendar, habits, and daily statistics.',
    0,
    0,
    '{"advancedAnalytics":false,"exportCsv":false,"rafiqAdvanced":false,"unlimitedHabits":false,"unlimitedGoals":false}'::jsonb,
    '{"maxActiveHabits":5,"maxActiveGoals":3,"dailyAiRequests":10}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'Advanced analytics, CSV exports, unlimited habits and goals, and full Rafiq AI.',
    900,
    8400,
    '{"advancedAnalytics":true,"exportCsv":true,"rafiqAdvanced":true,"unlimitedHabits":true,"unlimitedGoals":true}'::jsonb,
    '{"maxActiveHabits":9999,"maxActiveGoals":9999,"dailyAiRequests":200}'::jsonb
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  entitlements = excluded.entitlements,
  limits = excluded.limits;

-- 3. User Subscriptions
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_id text not null default 'free' references public.subscription_plans (id),
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  provider text not null default 'none' check (provider in ('none', 'stripe', 'paddle', 'manual')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz not null default timezone('utc', now()),
  current_period_end timestamptz,
  grace_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subscriptions_plan_status on public.subscriptions (plan_id, status);

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own_or_admin"
  on public.subscriptions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "subscriptions_insert_own_free"
  on public.subscriptions for insert
  with check (auth.uid() = user_id and plan_id = 'free' and status = 'active');

create policy "subscriptions_admin_update"
  on public.subscriptions for update
  using (public.is_admin())
  with check (public.is_admin());

-- 4. Offline Sync Operations (Idempotency Ledger)
create table if not exists public.sync_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null,
  entity_type text not null,
  entity_id text,
  operation text not null check (operation in ('create', 'update', 'delete', 'toggle')),
  payload jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz not null,
  status text not null default 'applied' check (status in ('applied', 'conflict', 'failed')),
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, idempotency_key)
);

create index if not exists idx_sync_operations_user_created on public.sync_operations (user_id, created_at desc);

alter table public.sync_operations enable row level security;

create policy "sync_operations_select_own"
  on public.sync_operations for select using (auth.uid() = user_id);
create policy "sync_operations_insert_own"
  on public.sync_operations for insert with check (auth.uid() = user_id);
create policy "sync_operations_update_own"
  on public.sync_operations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Platform Config (Admin writable, authenticated readable)
create table if not exists public.platform_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_platform_config_updated_at on public.platform_config;
create trigger trg_platform_config_updated_at
  before update on public.platform_config
  for each row execute function public.set_updated_at();

alter table public.platform_config enable row level security;

create policy "platform_config_read_auth"
  on public.platform_config for select
  using (auth.role() = 'authenticated' or public.is_admin());

create policy "platform_config_admin_write"
  on public.platform_config for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.platform_config (key, value)
values
  ('maintenance_mode', '{"enabled":false}'::jsonb),
  ('ai_enabled', '{"enabled":true}'::jsonb),
  ('allow_signups', '{"enabled":true}'::jsonb)
on conflict (key) do nothing;

-- 6. Audit Logs (Admin-only readable, written by security-definer RPCs)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_select"
  on public.audit_logs for select
  using (public.is_admin());

-- 7. Server-Side Entitlement & Admin RPC Functions
create or replace function public.get_effective_plan(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub record;
begin
  select plan_id, status, current_period_end, grace_period_end
  into v_sub
  from public.subscriptions
  where user_id = p_user_id;

  if not found then
    return 'free';
  end if;

  if v_sub.plan_id = 'pro' then
    if v_sub.status in ('active', 'trialing') then
      if v_sub.current_period_end is null or v_sub.current_period_end >= now() then
        return 'pro';
      end if;
    elsif v_sub.status = 'past_due' and v_sub.grace_period_end is not null and v_sub.grace_period_end >= now() then
      return 'pro';
    elsif v_sub.status = 'canceled' and v_sub.current_period_end is not null and v_sub.current_period_end >= now() then
      return 'pro';
    end if;
  end if;

  return 'free';
end;
$$;

create or replace function public.admin_get_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_users integer;
  v_pro_users integer;
  v_total_tasks integer;
  v_total_habits integer;
  v_total_goals integer;
  v_ai_requests integer;
  v_ai_cost numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select count(*) into v_total_users from public.profiles;
  select count(*) into v_pro_users from public.subscriptions where plan_id = 'pro' and status in ('active', 'trialing');
  select count(*) into v_total_tasks from public.tasks;
  select count(*) into v_total_habits from public.habits where is_archived = false;
  select count(*) into v_total_goals from public.goals;
  select count(*), coalesce(sum(estimated_cost), 0) into v_ai_requests, v_ai_cost from public.ai_usage;

  return jsonb_build_object(
    'totalUsers', v_total_users,
    'proUsers', v_pro_users,
    'freeUsers', greatest(0, v_total_users - v_pro_users),
    'totalTasks', v_total_tasks,
    'totalHabits', v_total_habits,
    'totalGoals', v_total_goals,
    'aiRequests', v_ai_requests,
    'aiEstimatedCost', v_ai_cost
  );
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  display_name text,
  role text,
  plan text,
  subscription_status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.role,
    coalesce(s.plan_id, p.plan) as plan,
    coalesce(s.status, 'active') as subscription_status,
    p.created_at
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id
  order by p.created_at desc
  limit 100;
end;
$$;

create or replace function public.admin_update_user_subscription(
  p_target_user_id uuid,
  p_plan_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start)
  values (p_target_user_id, p_plan_id, p_status, 'manual', timezone('utc', now()))
  on conflict (user_id) do update
  set plan_id = excluded.plan_id,
      status = excluded.status,
      updated_at = timezone('utc', now());

  update public.profiles
  set plan = case when p_plan_id = 'pro' and p_status in ('active', 'trialing') then 'premium' else 'free' end
  where id = p_target_user_id;

  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    'admin_update_subscription',
    'user',
    p_target_user_id::text,
    jsonb_build_object('plan_id', p_plan_id, 'status', p_status)
  );
end;
$$;
