import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 💡 1. サーバー起動時にキーが読み込めない場合のエラーを防ぐ（安全対策）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16', // ※もしここで赤い波線が出る場合は、エラーメッセージで指定された最新の日付（例: '2024-04-10'など）に書き換えてください
});

export async function POST(req: Request) {
  try {
    // 💡 2. ヘッダーの 'origin' に依存せず、リクエスト元のURLから確実にドメインを生成する
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // 決済セッション（支払いページ）を作成する
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['promptpay', 'card'], // タイ市場向けのPromptPayとカード
      line_items: [
        {
          price_data: {
            currency: 'thb', 
            product_data: {
              name: 'プレミアム会員 (1ヶ月パス)',
              description: '広告非表示・SNSランキング全開放',
            },
            unit_amount: 2000, // 20 THB = 2000 サタン
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // 💡 3. 確実に生成した baseUrl を使用する
      success_url: `${baseUrl}/?success=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    // 💡 4. エラーの理由がターミナルで詳しく分かるようにログを出力
    console.error('Stripe API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}