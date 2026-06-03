import { NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route-client';

export async function GET() {
  const supabase = createRouteClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL!));
}
