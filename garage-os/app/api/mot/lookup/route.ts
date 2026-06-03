import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient as createClient } from '@/lib/supabase/route-client';
import { lookupMotByRegistration } from '@/lib/dvsa-mot';
import { lookupByRegistrationVes } from '@/lib/dvla-ves';

/**
 * GET /api/mot/lookup?reg=AB12CDE
 *
 * Strategy:
 *  1. If DVSA credentials configured → try DVSA (full MOT history)
 *     - If DVSA returns NOT_FOUND (new car, no MOT yet) → fall through to DVLA VES
 *     - If DVSA returns any other error → return that error
 *  2. If DVLA_API_KEY set → use DVLA VES (make, colour, fuel, MOT expiry)
 *  3. Neither → CONFIG_ERROR
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const reg = request.nextUrl.searchParams.get('reg');
  if (!reg) {
    return NextResponse.json({ error: 'Missing ?reg= parameter' }, { status: 400 });
  }

  const dvsaConfigured = !!(
    process.env.DVSA_API_KEY &&
    process.env.DVSA_CLIENT_ID &&
    process.env.DVSA_CLIENT_SECRET &&
    process.env.DVSA_TOKEN_URL
  );

  // ── Path 1: DVSA (full MOT history) ────────────────────────────────────────
  if (dvsaConfigured) {
    console.log(`[mot/lookup] trying DVSA for ${reg}`);
    const result = await lookupMotByRegistration(reg);

    if (result.success) {
      console.log(`[mot/lookup] DVSA success — ${result.allTests.length} tests`);
      const yearOfManufacture = result.firstUsedDate
        ? parseInt(result.firstUsedDate.split('-')[0], 10)
        : undefined;
      return NextResponse.json({ ...result, source: 'dvsa', yearOfManufacture });
    }

    console.log(`[mot/lookup] DVSA failed: ${result.code} — ${result.error}`);

    // For NOT_FOUND: vehicle is likely too new for an MOT — fall through to DVLA VES
    // For anything else (auth error, rate limit, etc.) return the error immediately
    if (result.code !== 'NOT_FOUND') {
      const statusMap: Record<string, number> = {
        INVALID_REG: 400,
        RATE_LIMITED: 429,
        AUTH_ERROR: 503,
        CONFIG_ERROR: 503,
      };
      const status = result.code ? (statusMap[result.code] ?? 500) : 500;
      return NextResponse.json({ error: result.error, code: result.code }, { status });
    }

    // NOT_FOUND: fall through to DVLA VES below
    console.log(`[mot/lookup] vehicle not in DVSA (no MOT yet?) — trying DVLA VES`);
  }

  // ── Path 2: DVLA VES (basic data) ────────────────────────────────────────
  if (process.env.DVLA_API_KEY) {
    console.log(`[mot/lookup] trying DVLA VES for ${reg}`);
    const result = await lookupByRegistrationVes(reg);

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

    console.log(`[mot/lookup] DVLA VES success — make: ${result.make}`);
    return NextResponse.json({
      success: true,
      source: 'dvla-ves',
      registration: result.registration,
      make: result.make ?? '',
      model: '',
      colour: result.colour,
      fuelType: result.fuelType,
      engineSizeCc: result.engineSizeCc,
      yearOfManufacture: result.yearOfManufacture,
      taxStatus: result.taxStatus,
      firstMotDueDate: result.firstMotDueDate,
      noMotYet: dvsaConfigured,
      latestTest: result.motExpiryDate
        ? { expiryDate: result.motExpiryDate, advisories: [], failures: [] }
        : undefined,
      allTests: [],
    });
  }

  // ── Path 3: Nothing configured ──────────────────────────────────────────────
  return NextResponse.json(
    { error: 'No vehicle lookup API configured.', code: 'CONFIG_ERROR' },
    { status: 503 }
  );
}
