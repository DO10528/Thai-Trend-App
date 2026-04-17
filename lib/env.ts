export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
} as const;

export type EnvKey = keyof typeof env;

/**
 * 環境変数を取得し、存在しない場合は警告またはエラーログを出力します。
 * 画面を白くしないため、例外は投げずに空文字を返します。
 */
export function requireEnv(key: EnvKey): string {
  const value = env[key];
  if (!value) {
    console.error(`[Env Error] Required environment variable is missing: ${key}`);
    return '';
  }
  return value;
}
