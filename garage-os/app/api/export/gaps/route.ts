import { createClient } from '@/lib/supabase/server';
import { getEffectiveOwnerId } from '@/lib/supabase/get-owner-id';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Fetch vehicles with joined counts
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      id, make, model, variant, year, registration, status, location_name,
      cover_image_url, purchase_price, current_value,
      has_v5c, has_service_book, has_owners_manual, has_spare_key,
      has_purchase_invoice, has_warranty_docs, has_mot_certificates,
      has_insurance_cert, has_stamped_history, has_toolkit,
      mot_records(id),
      insurance_policies(id),
      vehicle_tax(id),
      maintenance_records(id),
      documents(id),
      vehicle_keys(id)
    `)
    .eq('owner_id', ownerId)
    .not('status', 'in', '("sold","written_off")')
    .order('make');

  if (!vehicles) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });

  const rows: string[][] = [];

  // Header
  rows.push([
    'Vehicle', 'Registration', 'Year', 'Status', 'Location', 'Missing Items'
  ]);

  for (const v of vehicles) {
    const missing: string[] = [];
    const name = [v.make, v.model, v.variant].filter(Boolean).join(' ');

    // Records
    if (!(v.mot_records as any[])?.length) missing.push('No MOT record');
    if (!(v.insurance_policies as any[])?.length) missing.push('No insurance record');
    if (!(v.vehicle_tax as any[])?.length) missing.push('No tax record');
    if (!(v.maintenance_records as any[])?.length) missing.push('No service history');
    if (!(v.documents as any[])?.length) missing.push('No documents uploaded');
    if (!(v.vehicle_keys as any[])?.length) missing.push('No keys logged');

    // Photos & valuation
    if (!v.cover_image_url) missing.push('No photo');
    if (!v.purchase_price) missing.push('No purchase price');
    if (!v.current_value) missing.push('No current valuation');

    // Paperwork checklist
    if (!v.has_v5c) missing.push('V5C logbook not confirmed');
    if (!v.has_service_book) missing.push('Service book not confirmed');
    if (!v.has_owners_manual) missing.push('Owner\'s manual not confirmed');
    if (!v.has_spare_key) missing.push('Spare key not confirmed');
    if (!v.has_purchase_invoice) missing.push('Purchase invoice not confirmed');
    if (!v.has_mot_certificates) missing.push('MOT certificates not confirmed');
    if (!v.has_insurance_cert) missing.push('Insurance cert not confirmed');
    if (!v.has_stamped_history) missing.push('Stamped history not confirmed');

    if (missing.length === 0) continue; // Skip complete vehicles

    rows.push([
      name,
      v.registration?.toUpperCase() || '—',
      String(v.year),
      v.status,
      v.location_name || 'Unassigned',
      missing.join('; '),
    ]);
  }

  const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="bluechip-gaps-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
