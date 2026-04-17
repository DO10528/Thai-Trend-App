import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireEnv } from '@/lib/env';

const stripeSecretKey = requireEnv('STRIPE_SECRET_KEY');
const baseUrl = requireEnv('NEXT_PUBLIC_BASE_URL');

// Only instantiate Stripe if the key is available
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia' as any,
}) : null;

export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe configuration is missing' }, { status: 500 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: 'Premium Plan (1 Month)',
              description: 'SNS Trend Map Premium Access',
            },
            unit_amount: 2000, // 20 THB => 2000 satangs
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown payment error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}