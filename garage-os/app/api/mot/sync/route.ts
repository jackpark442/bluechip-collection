import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient as createClient } from '@/lib/supabase/route-client';
import { lookupMotByRegistration } from '@/lib/dvsa-mot';

async function getOwnerId(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles').select('role, admin_id').eq('id', userId).maybeSingle();
  if (profile?.role === 'client' && profile?.admin_id) return profile.admin_id;
  return userId;
}

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const ownerId = await getOwnerId(supabase, user.id);

  let body: { vehicleId?: string; registration?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { vehicleId, registration } = body;
  if (!vehicleId || !registration) {
    return NextResponse.json({ error: 'vehicleId and registration are required' }, { status: 400 });
  }

  // Verify vehicle is accessible — use ownerId not user.id
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, make, model, colour, engine_size_cc, fuel_type')
    .eq('id', vehicleId)
    .eq('owner_id', ownerId)
    .single();

  if (vehicleError || !vehicle) {
    return NextResponse.json({
      error: `Vehicle not found (id=${vehicleId}, ownerId=${ownerId})`,
      vehicleError: vehicleError?.message,
    }, { status: 404 });
  }

  // Call DVSA API
  const dvsa = await lookupMotByRegistration(registration);
  if (!dvsa.success) {
    return NextResponse.json({ error: dvsa.error, code: dvsa.code }, { status: 422 });
  }

  if (!dvsa.allTests || dvsa.allTests.length === 0) {
    return NextResponse.json({ ok: true, imported: 0, dvsa: { totalTests: 0, registration: dvsa.registration } });
  }

  // Upsert ALL MOT records from full history
  let motRecord = null;
  let imported = 0;
  const errors: string[] = [];

  for (const test of dvsa.allTests) {
    try {
      const testDate = test.completedDate.split(' ')[0];
      const expiryDate = test.expiryDate ?? null;
      const result = test.testResult === 'PASSED' ? 'pass' : 'fail';

      const advisories = (test.rfrAndComments ?? [])
        .filter((r: any) => r.type === 'ADVISORY' || r.type === 'USER ENTERED')
        .map((r: any) => r.text ?? String(r));
      const failures = (test.rfrAndComments ?? [])
        .filter((r: any) => r.type === 'MAJOR' || r.type === 'DANGEROUS' || r.type === 'MINOR' || r.type === 'FAIL')
        .map((r: any) => `[${r.type}] ${r.text ?? String(r)}`);

      const mileage = test.odometerResultType === 'READ' && test.odometerValue
        ? (test.odometerUnit === 'km'
          ? Math.round(parseInt(test.odometerValue, 10) * 0.621371)
          : parseInt(test.odometerValue, 10))
        : null;

      const motPayload = {
        vehicle_id: vehicleId,
        owner_id: ownerId,
        test_date: testDate,
        expiry_date: expiryDate ?? testDate,
        result,
        mileage_at_test: mileage,
        certificate_number: test.motTestNumber ?? null,
        advisories: advisories.length ? advisories : null,
        failures:   failures.length   ? failures   : null,
        notes: `Synced from DVSA on ${new Date().toISOString().split('T')[0]}`,
      };

      const { data: existing } = await supabase
        .from('mot_records').select('id').eq('vehicle_id', vehicleId).eq('test_date', testDate).maybeSingle();

      if (existing) {
        const { data: updated, error: updateErr } = await supabase
          .from('mot_records').update(motPayload).eq('id', existing.id).select().single();
        if (updateErr) errors.push(`Update ${testDate}: ${updateErr.message}`);
        else if (!motRecord || testDate > (motRecord as any).test_date) motRecord = updated;
      } else {
        const { data: created, error: insertErr } = await supabase
          .from('mot_records').insert(motPayload).select().single();
        if (insertErr) errors.push(`Insert ${testDate}: ${insertErr.message}`);
        else {
          if (!motRecord || testDate > (motRecord as any).test_date) motRecord = created;
          imported++;
        }
      }
    } catch (err: any) {
      errors.push(`Test error: ${err?.message ?? String(err)}`);
    }
  }

  // ── Clean up stale MOT reminders, keep just one for the latest expiry ────────
  // Find the latest PASSED test with an actual expiry date
  const latestPassed = dvsa.allTests
    .filter(t => t.testResult === 'PASSED' && t.expiryDate)
    .sort((a, b) => b.expiryDate!.localeCompare(a.expiryDate!))
    [0];

  if (latestPassed?.expiryDate) {
    // Delete all existing mot_due reminders for this vehicle
    await supabase.from('reminders')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', ownerId)
      .eq('type', 'mot_due');

    // Create a single reminder for the latest MOT expiry
    const expiryDate = latestPassed.expiryDate;
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Only create reminder if not already expired more than 1 year ago
    if (daysUntilExpiry > -365) {
      await supabase.from('reminders').insert({
        vehicle_id: vehicleId,
        owner_id: ownerId,
        type: 'mot_due',
        title: 'MOT Due',
        description: `MOT expires ${expiryDate}`,
        due_date: expiryDate,
        status: daysUntilExpiry < 0 ? 'pending' : 'pending',
        notify_days_before: [60, 30, 14, 7],
      });
    }
  }

  // Enrich vehicle data from DVSA if fields are missing
  const vehicleUpdates: Record<string, unknown> = {};
  if (!vehicle.colour && dvsa.colour) vehicleUpdates.colour = capitalise(dvsa.colour);
  if (!vehicle.engine_size_cc && dvsa.engineSizeCc) vehicleUpdates.engine_size_cc = dvsa.engineSizeCc;
  if (!vehicle.fuel_type && dvsa.fuelType) {
    const fuelMap: Record<string, string> = {
      'Petrol': 'petrol', 'Diesel': 'diesel', 'Electric': 'electric',
      'Hybrid Electric': 'hybrid', 'Gas Bi-Fuel': 'lpg',
    };
    const mapped = fuelMap[dvsa.fuelType];
    if (mapped) vehicleUpdates.fuel_type = mapped;
  }
  if (Object.keys(vehicleUpdates).length > 0) {
    await supabase.from('vehicles').update(vehicleUpdates).eq('id', vehicleId);
  }

  return NextResponse.json({
    ok: true,
    imported,
    errors: errors.length ? errors : undefined,
    motRecord,
    dvsa: {
      registration: dvsa.registration,
      make: dvsa.make,
      model: dvsa.model,
      totalTests: dvsa.allTests.length,
    },
  });
}
