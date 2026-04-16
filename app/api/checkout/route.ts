import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 💡 修正：apiVersionを削除、または 'any' でキャストして型チェックを回避
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any, 
});

export async function POST() {
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
            unit_amount: 2000, // 20 THB
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Vercel上のURLかlocalhostかを自動で切り替え
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://' + process.env.VERCEL_URL}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://' + process.env.VERCEL_URL}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}