import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import FleetMapClient from '@/components/FleetMapClient';

export default async function MapPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, make, model, year, registration, category, status, cover_image_url, location_name, location_address, location_lat, location_lng, current_value')
    .eq('owner_id', user.id)
    .not('location_lat', 'is', null);

  return (
    <AppLayout>
      <FleetMapClient vehicles={vehicles || []} />
    </AppLayout>
  );
}
