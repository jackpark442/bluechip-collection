import { createClient } from '@/lib/supabase/server';
import { getEffectiveOwnerId } from '@/lib/supabase/get-owner-id';
import { redirect, notFound } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import VehicleProfile from '@/components/vehicles/VehicleProfile';

export default async function VehiclePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) redirect('/auth/login');

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', params.id)
    .eq('owner_id', ownerId)
    .single();

  if (!vehicle) notFound();

  const [
    { data: images },
    { data: motRecords },
    { data: insurance },
    { data: taxRecords },
    { data: maintenance },
    { data: documents },
    { data: reminders },
    { data: valuations },
    { data: vehicleKeys },
    { data: jobs },
  ] = await Promise.all([
    supabase.from('vehicle_images').select('*').eq('vehicle_id', params.id).order('sort_order'),
    supabase.from('mot_records').select('*').eq('vehicle_id', params.id).order('expiry_date', { ascending: false }),
    supabase.from('insurance_policies').select('*').eq('vehicle_id', params.id).order('end_date', { ascending: false }),
    supabase.from('vehicle_tax').select('*').eq('vehicle_id', params.id).order('end_date', { ascending: false }),
    supabase.from('maintenance_records').select('*').eq('vehicle_id', params.id).order('service_date', { ascending: false }),
    supabase.from('documents').select('*').eq('vehicle_id', params.id).order('created_at', { ascending: false }),
    supabase.from('reminders').select('*').eq('vehicle_id', params.id).eq('status', 'pending').order('due_date'),
    supabase.from('valuations').select('*').eq('vehicle_id', params.id).order('valuation_date', { ascending: false }),
    supabase.from('vehicle_keys').select('*').eq('vehicle_id', params.id).order('created_at'),
    supabase.from('vehicle_jobs').select('*').eq('vehicle_id', params.id).order('created_at'),
  ]);

  return (
    <AppLayout>
      <VehicleProfile
        vehicle={vehicle}
        images={images || []}
        motRecords={motRecords || []}
        insurance={insurance || []}
        taxRecords={taxRecords || []}
        maintenance={maintenance || []}
        documents={documents || []}
        reminders={reminders || []}
        valuations={valuations || []}
        vehicleKeys={vehicleKeys || []}
        jobs={(jobs as any) || []}
      />
    </AppLayout>
  );
}
