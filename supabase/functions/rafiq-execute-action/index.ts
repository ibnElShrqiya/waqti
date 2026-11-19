import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AIProposedActionType } from '../_shared/ai/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_TYPES = new Set<AIProposedActionType>([
  'create_task',
  'update_task_schedule',
  'create_event',
  'create_habit',
  'update_goal',
]);

const VALID_PRIORITIES = new Set(['urgent', 'high', 'medium', 'low']);
const VALID_HABIT_FREQS = new Set(['daily', 'weekdays', 'weekly_target', 'monthly_target']);
const VALID_GOAL_STATUSES = new Set(['active', 'completed', 'paused', 'archived']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: authErr } = await client.auth.getUser();
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = (await req.json()) as {
      type?: AIProposedActionType;
      payload?: Record<string, unknown>;
    };

    if (!body.type || !ALLOWED_TYPES.has(body.type) || !body.payload || typeof body.payload !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid action payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const p = body.payload;

    if (body.type === 'create_task') {
      const title = typeof p.title === 'string' ? p.title.trim() : '';
      if (!title || title.length > 240) throw new Error('Task title must be 1..240 characters');
      const priority = typeof p.priority === 'string' && VALID_PRIORITIES.has(p.priority) ? p.priority : 'medium';
      const estimatedMinutes =
        typeof p.estimatedMinutes === 'number' && Number.isFinite(p.estimatedMinutes) && p.estimatedMinutes >= 0
          ? Math.round(p.estimatedMinutes)
          : null;

      const { data, error } = await client
        .from('tasks')
        .insert({
          user_id: user.id,
          title,
          priority,
          due_at: typeof p.dueAt === 'string' ? p.dueAt : null,
          start_at: typeof p.startAt === 'string' ? p.startAt : null,
          end_at: typeof p.endAt === 'string' ? p.endAt : null,
          estimated_minutes: estimatedMinutes,
        })
        .select('id, title')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.type === 'update_task_schedule') {
      const taskId = typeof p.taskId === 'string' ? p.taskId : '';
      if (!taskId) throw new Error('taskId is required');
      const patch: Record<string, unknown> = {};
      if ('startAt' in p) patch.start_at = typeof p.startAt === 'string' ? p.startAt : null;
      if ('endAt' in p) patch.end_at = typeof p.endAt === 'string' ? p.endAt : null;
      if ('dueAt' in p) patch.due_at = typeof p.dueAt === 'string' ? p.dueAt : null;
      if (Object.keys(patch).length === 0) throw new Error('No schedule fields provided');

      const { data, error } = await client
        .from('tasks')
        .update(patch)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select('id, title')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.type === 'create_event') {
      const title = typeof p.title === 'string' ? p.title.trim() : '';
      const startAt = typeof p.startAt === 'string' ? p.startAt : '';
      const endAt = typeof p.endAt === 'string' ? p.endAt : '';
      if (!title || title.length > 240 || !startAt || !endAt) {
        throw new Error('Valid title, startAt, and endAt are required');
      }
      if (new Date(endAt).getTime() < new Date(startAt).getTime()) {
        throw new Error('endAt must be >= startAt');
      }
      const { data, error } = await client
        .from('calendar_events')
        .insert({
          user_id: user.id,
          title,
          start_at: startAt,
          end_at: endAt,
          timezone: typeof p.timezone === 'string' ? p.timezone : 'UTC',
        })
        .select('id, title')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.type === 'create_habit') {
      const name = typeof p.name === 'string' ? p.name.trim() : '';
      if (!name || name.length > 120) throw new Error('Habit name must be 1..120 characters');

      const { data: quota } = await client.rpc('check_user_quota', { p_resource: 'maxActiveHabits' });
      if (quota && quota.allowed === false) {
        throw new Error('Active habit limit reached for your current plan');
      }

      const frequencyType =
        typeof p.frequencyType === 'string' && VALID_HABIT_FREQS.has(p.frequencyType)
          ? p.frequencyType
          : 'daily';
      const targetCount =
        typeof p.targetCount === 'number' && Number.isFinite(p.targetCount)
          ? Math.min(99, Math.max(1, Math.round(p.targetCount)))
          : 1;

      const { data, error } = await client
        .from('habits')
        .insert({
          user_id: user.id,
          name,
          frequency_type: frequencyType,
          target_count: targetCount,
        })
        .select('id, name')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.type === 'update_goal') {
      const goalId = typeof p.goalId === 'string' ? p.goalId : '';
      if (!goalId) throw new Error('goalId is required');
      const patch: Record<string, unknown> = {};
      if (typeof p.manualProgress === 'number' && Number.isFinite(p.manualProgress)) {
        patch.manual_progress = Math.min(100, Math.max(0, Math.round(p.manualProgress)));
      }
      if (typeof p.currentValue === 'number' && Number.isFinite(p.currentValue) && p.currentValue >= 0) {
        patch.current_value = p.currentValue;
      }
      if (typeof p.status === 'string' && VALID_GOAL_STATUSES.has(p.status)) {
        patch.status = p.status;
      }
      if (Object.keys(patch).length === 0) throw new Error('No valid goal fields provided');

      const { data, error } = await client
        .from('goals')
        .update(patch)
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select('id, title')
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, result: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Execution failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
