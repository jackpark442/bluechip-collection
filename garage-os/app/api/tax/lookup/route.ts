import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient as createClient } from '@/lib/supabase/route-client';
import { lookupByRegistrationVes } from '@/lib/dvla-ves';

/**
 * GET /api/tax/lookup?reg=AB12CDE
 *
 * Returns live tax and SORN status from DVLA VES.
 * Requires DVLA_API_KEY environment variable.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const reg = request.nextUrl.searchParams.get('reg');
  if (!reg) return NextResponse.json({ error: 'Missing ?reg= parameter' }, { status: 400 });

  if (!process.env.DVLA_API_KEY) {
    return NextResponse.json({ error: 'DVLA_API_KEY not configured', code: 'CONFIG_ERROR' }, { status: 503 });
  }

  const result = await lookupByRegistrationVes(reg);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404, INVALID_REG: 400, RATE_LIMITED: 429,
      AUTH_ERROR: 503, CONFIG_ERROR: 503,
    };
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.code ? (statusMap[result.code] ?? 500) : 500 }
    );
  }

  return NextResponse.json({
    registration: result.registration,
    taxStatus:    result.taxStatus,
    taxDueDate:   result.taxDueDate,
    motStatus:    result.motExpiryDate ? 'Valid' : undefined,
    motExpiryDate: result.motExpiryDate,
    make:         result.make,
    colour:       result.colour,
  });
}
