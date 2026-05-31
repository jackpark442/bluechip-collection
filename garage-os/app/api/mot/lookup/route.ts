import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient as createClient } from '@/lib/supabase/route-client';
import { lookupMotByRegistration } from '@/lib/dvsa-mot';

/**
 * GET /api/mot/lookup?reg=AB12CDE
 *
 * Looks up the MOT history for a UK registration via the DVSA API.
 * Requires an authenticated session.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const reg = request.nextUrl.searchParams.get('reg');
  if (!reg) {
    return NextResponse.json({ error: 'Missing ?reg= parameter' }, { status: 400 });
  }

  const result = await lookupMotByRegistration(reg);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      INVALID_REG: 400,
      RATE_LIMITED: 429,
      AUTH_ERROR: 503,
      CONFIG_ERROR: 503,
    };
    const status = result.code ? (statusMap[result.code] ?? 500) : 500;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json(result);
}
