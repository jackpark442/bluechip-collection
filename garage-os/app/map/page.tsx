import { createClient } from '@/lib/supabase/server';
import { getEffectiveOwnerId } from '@/lib/supabase/get-owner-id';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import FleetMapClient from '@/components/FleetMapClient';

export default async function MapPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) redirect('/auth/login');

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, year, registration, category, status, cover_image_url, location_name, location_address, location_lat, location_lng, current_value')
    .eq('owner_id', ownerId)
    .not('location_lat', 'is', null);

  return (
    <AppLayout>
      <FleetMapClient vehicles={vehicles || []} />
    </AppLayout>
  );
}
