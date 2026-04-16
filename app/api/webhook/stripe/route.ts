import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.customer_details?.email;

    if (userEmail) {
      // 💡 修正：upsertを使用して、既存のプロフィールを更新
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: session.client_reference_id || undefined, // IDがあれば使用
          email: userEmail, 
          is_premium: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) console.error('Supabase Error:', error);
      console.log(`🎉 ${userEmail} upgraded!`);
    }
  }
  return NextResponse.json({ received: true });
}