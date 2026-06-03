import { createClient } from '@/lib/supabase/server';
import { getEffectiveOwnerId } from '@/lib/supabase/get-owner-id';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import CalendarClient from '@/components/calendar/CalendarClient';

export default async function CalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) redirect('/auth/login');

  const [
    { data: vehicles },
    { data: motRecords },
    { data: insurance },
    { data: taxRecords },
    { data: maintenance },
    { data: reminders },
  ] = await Promise.all([
    supabase.from('vehicles').select('id, make, model, year, registration, cover_image_url').eq('owner_id', ownerId),
    supabase.from('mot_records').select('id, vehicle_id, expiry_date, result').eq('owner_id', ownerId),
    supabase.from('insurance_policies').select('id, vehicle_id, provider, end_date').eq('owner_id', ownerId),
    supabase.from('vehicle_tax').select('id, vehicle_id, end_date, is_exempt').eq('owner_id', ownerId),
    supabase.from('maintenance_records').select('id, vehicle_id, title, service_type, next_service_date, service_date').eq('owner_id', ownerId),
    supabase.from('reminders').select('id, vehicle_id, title, due_date, type').eq('owner_id', ownerId).eq('status', 'pending'),
  ]);

  return (
    <AppLayout>
      <CalendarClient
        vehicles={vehicles || []}
        motRecords={motRecords || []}
        insurance={insurance || []}
        taxRecords={taxRecords || []}
        maintenance={maintenance || []}
        reminders={reminders || []}
      />
    </AppLayout>
  );
}
