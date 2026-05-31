import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const authRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ email, password }),
    }
  );

  const session = await authRes.json();

  if (!authRes.ok || session.error) {
    return NextResponse.json({ error: session.error_description || 'Login failed' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  // Store access and refresh tokens in simple cookies the server client can read
  response.cookies.set('sb-access-token', session.access_token, {
    path: '/',
    sameSite: 'lax',
    maxAge: session.expires_in,
  });
  response.cookies.set('sb-refresh-token', session.refresh_token, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });

  console.log('[login] user:', session.user?.email);

  return response;
}
