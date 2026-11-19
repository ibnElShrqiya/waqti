-- =============================================================================
-- WAQTI — Security & Production Hardening Migration
-- Addresses:
--   1. Prevent client-side spoofing of ai_usage (server-side service_role only)
--   2. Enforce caller authorization inside get_effective_plan(uuid)
--   3. Lock search_path on set_updated_at()
--   4. Add server-side resource quota check RPC
-- =============================================================================

-- 1. Lock search_path on set_updated_at()
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2. Drop client-side INSERT policy on ai_usage (Edge Functions write via service_role)
drop policy if exists "ai_usage_insert_own" on public.ai_usage;

-- 3. Enforce ownership/admin check inside get_effective_plan(p_user_id)
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
  if auth.uid() is not null and auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

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

-- 4. Server-side quota check helper for habits, goals, and daily AI requests
create or replace function public.check_user_quota(p_resource text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_limit integer;
  v_used integer := 0;
begin
  if v_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  v_plan := public.get_effective_plan(v_uid);

  select coalesce((limits ->> p_resource)::integer, 0)
  into v_limit
  from public.subscription_plans
  where id = v_plan;

  if p_resource = 'maxActiveHabits' then
    select count(*) into v_used from public.habits where user_id = v_uid and is_archived = false;
  elsif p_resource = 'maxActiveGoals' then
    select count(*) into v_used from public.goals where user_id = v_uid and status = 'active';
  elsif p_resource = 'dailyAiRequests' then
    select count(*) into v_used from public.ai_usage where user_id = v_uid and created_at >= date_trunc('day', timezone('utc', now()));
  else
    raise exception 'Unknown resource: %', p_resource using errcode = '22023';
  end if;

  return jsonb_build_object(
    'plan', v_plan,
    'used', v_used,
    'limit', v_limit,
    'allowed', v_used < v_limit
  );
end;
$$;
