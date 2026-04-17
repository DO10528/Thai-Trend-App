import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';

const stripeSecretKey = requireEnv('STRIPE_SECRET_KEY');
const webhookSecret = requireEnv('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any,
}) : null;

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey) 
  ? createClient(supabaseUrl, supabaseServiceRoleKey) 
  : null;

export async function POST(req: Request) {
  if (!stripe || !supabaseAdmin || !webhookSecret) {
    return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown webhook signature error';
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.customer_details?.email;

    if (userEmail) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({ 
          id: session.client_reference_id || undefined,
          email: userEmail, 
          is_premium: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'email' });

      if (error) {
        console.error('Supabase Error updating profile:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
      console.log(`🎉 ${userEmail} upgraded!`);
    } else {
      console.warn('Webhook received checkout session without user email');
    }
  }

  return NextResponse.json({ received: true });
}