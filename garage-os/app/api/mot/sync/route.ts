import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient as createClient } from '@/lib/supabase/route-client';
import { lookupMotByRegistration } from '@/lib/dvsa-mot';

/**
 * POST /api/mot/sync
 * Body: { vehicleId: string, registration: string }
 *
 * Fetches the latest MOT data from DVSA and:
 * 1. Upserts the latest MOT record into mot_records
 * 2. Optionally updates vehicle make/model/colour/engine if values missing
 * 3. Returns the created/updated MOT record
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: { vehicleId?: string; registration?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { vehicleId, registration } = body;
  if (!vehicleId || !registration) {
    return NextResponse.json({ error: 'vehicleId and registration are required' }, { status: 400 });
  }

  // Verify vehicle belongs to user
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, make, model, colour, engine_size_cc, fuel_type')
    .eq('id', vehicleId)
    .eq('owner_id', user.id)
    .single();

  if (vehicleError || !vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  // Call DVSA API
  const dvsa = await lookupMotByRegistration(registration);
  if (!dvsa.success) {
    return NextResponse.json({ error: dvsa.error, code: dvsa.code }, { status: 422 });
  }

  // ── Upsert ALL MOT records from full history ─────────────────────────────
  let motRecord = null;
  let imported = 0;

  for (const test of dvsa.allTests) {
    const testDate = test.completedDate.split(' ')[0];
    const expiryDate = test.expiryDate ?? null;
    const result = test.testResult === 'PASSED' ? 'pass' : 'fail';

    // Split rfrAndComments into advisories and failures
    const advisories = test.rfrAndComments
      .filter((r: any) => r.type === 'ADVISORY' || r.type === 'USER ENTERED')
      .map((r: any) => r.text ?? r.deficiencyText ?? String(r));
    const failures = test.rfrAndComments
      .filter((r: any) => r.type === 'FAIL' || r.dangerous === true)
      .map((r: any) => r.text ?? r.deficiencyText ?? String(r));

    const mileage = test.odometerResultType === 'READ' && test.odometerValue
      ? parseInt(test.odometerValue, 10)
      : null;

    const motPayload = {
      vehicle_id: vehicleId,
      owner_id: user.id,
      test_date: testDate,
      expiry_date: expiryDate ?? testDate,
      result,
      mileage_at_test: mileage,
      certificate_number: test.motTestNumber ?? null,
      advisories: advisories.length ? advisories : null,
      failures:   failures.length   ? failures   : null,
      notes: `Imported from DVSA MOT History API on ${new Date().toISOString().split('T')[0]}`,
    };

    // Upsert by test_date (each date is unique per vehicle)
    const { data: existing } = await supabase
      .from('mot_records')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .eq('test_date', testDate)
      .maybeSingle();

    if (existing) {
      const { data: updated } = await supabase
        .from('mot_records').update(motPayload).eq('id', existing.id).select().single();
      if (!motRecord || testDate > (motRecord as any).test_date) motRecord = updated;
    } else {
      const { data: created } = await supabase
        .from('mot_records').insert(motPayload).select().single();
      if (!motRecord || testDate > (motRecord as any).test_date) motRecord = created;
      imported++;
    }
  }

  // ── Optionally enrich vehicle data from DVSA ───────────────────────────────
  const vehicleUpdates: Record<string, unknown> = {};

  if (!vehicle.colour && dvsa.colour) {
    vehicleUpdates.colour = capitalise(dvsa.colour);
  }
  if (!vehicle.engine_size_cc && dvsa.engineSizeCc) {
    vehicleUpdates.engine_size_cc = dvsa.engineSizeCc;
  }
  if (!vehicle.fuel_type && dvsa.fuelType) {
    const fuelMap: Record<string, string> = {
      'Petrol': 'petrol', 'Diesel': 'diesel',
      'Electric': 'electric', 'Hybrid Electric': 'hybrid',
      'Gas Bi-Fuel': 'lpg', 'Petrol/Gas': 'lpg',
    };
    const mapped = fuelMap[dvsa.fuelType];
    if (mapped) vehicleUpdates.fuel_type = mapped;
  }

  if (Object.keys(vehicleUpdates).length > 0) {
    await supabase.from('vehicles').update(vehicleUpdates).eq('id', vehicleId);
  }

  return NextResponse.json({
    ok: true,
    motRecord,
    imported,
    vehicleUpdates: Object.keys(vehicleUpdates).length > 0 ? vehicleUpdates : null,
    dvsa: {
      registration: dvsa.registration,
      make: dvsa.make,
      model: dvsa.model,
      totalTests: dvsa.allTests.length,
    },
  });
}

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
