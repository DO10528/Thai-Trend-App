import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  try {
    // 💡 サーバー起動時のクラッシュを防ぐため、ここでキーを確認します
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: "Stripeのシークレットキーが見つかりません。環境変数(.env.local)を確認してください。" }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2026-03-25.dahlia',
    });

    // 💡 URLの取得でエラーが出ないように安全な方法に変更
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['promptpay', 'card'],
      line_items: [
        {
          price_data: {
            currency: 'thb',
            product_data: {
              name: 'プレミアム会員 (1ヶ月パス)',
              description: '広告非表示・SNSランキング全開放',
            },
            unit_amount: 2000, // 20 THB = 2000 satang
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}