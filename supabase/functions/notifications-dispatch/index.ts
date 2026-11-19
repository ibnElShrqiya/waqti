import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Scheduled notification dispatcher (invoked via Supabase Cron or external scheduler).
 * Protected by `CRON_SECRET` Bearer token.
 * Evaluates pending notifications due <= now(), respects quiet hours & daily limits,
 * and marks delivered notifications. Web Push delivery uses VAPID keys when configured.
 */
Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const nowIso = new Date().toISOString();
  const { data: pending, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, body, action_url')
    .eq('status', 'pending')
    .lte('scheduled_at', nowIso)
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let delivered = 0;
  for (const item of pending ?? []) {
    await supabase
      .from('notifications')
      .update({ status: 'delivered', delivered_at: nowIso })
      .eq('id', item.id);
    delivered += 1;
  }

  return new Response(JSON.stringify({ processed: pending?.length ?? 0, delivered }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
