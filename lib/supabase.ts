import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  let val = process.env[key] || '';
  if (val.startsWith(`${key}=`)) {
    val = val.replace(`${key}=`, '');
  }
  val = val.replace(/^"|"$/g, ''); // Remove quotes if they exist
  return val.trim();
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);