import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentProviderAdapter {
  readonly name: 'none' | 'stripe' | 'manual';
  createCheckoutOrSwitch(params: {
    userId: string;
    targetPlan: 'free' | 'pro';
    returnUrl?: string;
  }): Promise<{ mode: 'checkout_url' | 'direct' | 'unconfigured'; url?: string; message: string }>;
}

class StripePlaceholderAdapter implements PaymentProviderAdapter {
  readonly name = 'stripe' as const;
  constructor(private readonly secretKey: string) {}

  async createCheckoutOrSwitch(): Promise<{ mode: 'checkout_url' | 'direct' | 'unconfigured'; url?: string; message: string }> {
    if (!this.secretKey) {
      return { mode: 'unconfigured', message: 'Stripe secret key is not configured.' };
    }
    return {
      mode: 'unconfigured',
      message: 'Stripe Price IDs must be configured before live checkout sessions can be created.',
    };
  }
}

class ManualDemoAdapter implements PaymentProviderAdapter {
  readonly name = 'manual' as const;
  async createCheckoutOrSwitch(params: { userId: string; targetPlan: 'free' | 'pro' }) {
    return {
      mode: 'direct' as const,
      message: `Demo/manual plan switch to ${params.targetPlan} authorized by ALLOW_DEMO_PLAN_SWITCH.`,
    };
  }
}

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

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user = userData.user;

    const body = (await req.json()) as {
      action?: 'get_entitlements' | 'request_plan_change' | 'cancel_at_period_end';
      targetPlan?: 'free' | 'pro';
      returnUrl?: string;
    };

    if (body.action === 'get_entitlements') {
      const { data: effectivePlan } = await userClient.rpc('get_effective_plan', { p_user_id: user.id });
      const { data: planRow } = await userClient
        .from('subscription_plans')
        .select('*')
        .eq('id', effectivePlan || 'free')
        .single();
      return new Response(JSON.stringify({ effectivePlan: effectivePlan || 'free', plan: planRow }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (body.action === 'cancel_at_period_end') {
      const { error } = await serviceClient
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('user_id', user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'request_plan_change') {
      const targetPlan = body.targetPlan === 'pro' ? 'pro' : 'free';
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')?.trim() ?? '';
      const allowDemoSwitch = Deno.env.get('ALLOW_DEMO_PLAN_SWITCH') === 'true';

      if (targetPlan === 'pro' && !allowDemoSwitch) {
        const adapter: PaymentProviderAdapter = new StripePlaceholderAdapter(stripeKey);
        const result = await adapter.createCheckoutOrSwitch({
          userId: user.id,
          targetPlan,
          returnUrl: body.returnUrl,
        });
        return new Response(JSON.stringify(result), {
          status: result.mode === 'unconfigured' ? 501 : 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const adapter = new ManualDemoAdapter();
      const result = await adapter.createCheckoutOrSwitch({ userId: user.id, targetPlan });

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 86_400_000).toISOString();

      await serviceClient.from('subscriptions').upsert(
        {
          user_id: user.id,
          plan_id: targetPlan,
          status: 'active',
          provider: 'manual',
          current_period_start: now.toISOString(),
          current_period_end: targetPlan === 'pro' ? periodEnd : null,
          cancel_at_period_end: false,
        },
        { onConflict: 'user_id' },
      );

      await serviceClient
        .from('profiles')
        .update({ plan: targetPlan === 'pro' ? 'premium' : 'free' })
        .eq('id', user.id);

      await serviceClient.from('audit_logs').insert({
        actor_id: user.id,
        action: 'plan_changed',
        target_type: 'subscription',
        target_id: user.id,
        metadata: { targetPlan, provider: adapter.name },
      });

      return new Response(JSON.stringify({ ok: true, ...result }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
