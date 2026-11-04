import { createClient } from '@supabase/supabase-js';
import { captchaEnabled, takeCaptchaToken } from '@/lib/captcha';
import { SupabaseBackend } from './SupabaseBackend';

/** Browser client: anonymous auth session persisted in localStorage, tokens refreshed automatically. */
export function createSupabaseBackend(url: string, anonKey: string): SupabaseBackend {
  const client = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return new SupabaseBackend(client, {
    snapshotUrl: '/api/street',
    captcha: captchaEnabled() ? { take: () => takeCaptchaToken() } : undefined,
  });
}
