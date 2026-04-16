import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

// 💡 サーバーサイド専用のSupabaseクライアント（権限が強いもの）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ※重要：後で取得します
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!; // ※重要：後で取得します

  let event: Stripe.Event;

  try {
    // 💡 偽物の通知ではないか、Stripeの署名を検証する（プロの必須処理）
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 💡 支払い完了イベントをキャッチ！
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.customer_details?.email;

    if (userEmail) {
      // 💡 Supabaseのユーザーを「プレミアム」に更新する
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ is_premium: true })
        .eq('email', userEmail);

      if (error) console.error('Supabase Update Error:', error);
      console.log(`🎉 ${userEmail} さんをプレミアム会員に昇格させました！`);
    }
  }

  return NextResponse.json({ received: true });
}