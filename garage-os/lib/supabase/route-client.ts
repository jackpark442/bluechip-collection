import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Use this in API route handlers instead of createClient() from server.ts
// It reads the session from our custom cookies set by /api/auth/login
export function createRouteClient() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  const refreshToken = cookieStore.get('sb-refresh-token')?.value;

  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (accessToken && refreshToken) {
    client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }

  return client;
}
