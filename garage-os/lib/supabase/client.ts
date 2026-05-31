import { createBrowserClient } from '@supabase/ssr';

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];
}

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const accessToken = getCookie('sb-access-token');
  const refreshToken = getCookie('sb-refresh-token');
  if (accessToken && refreshToken) {
    clientInstance.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }

  return clientInstance;
}
