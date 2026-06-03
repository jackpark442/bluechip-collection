import { createClient } from '@/lib/supabase/server';
import { getEffectiveOwnerId } from '@/lib/supabase/get-owner-id';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import SearchClient from '@/components/SearchClient';

export default async function SearchPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) redirect('/auth/login');

  const { data: fleet } = await supabase
    .from('fleet_overview')
    .select('*')
    .eq('owner_id', ownerId);

  const { data: maintenance } = await supabase
    .from('maintenance_records')
    .select('id, title, service_date, total_cost, vehicle:vehicles(id, make, model, year)')
    .eq('owner_id', ownerId)
    .order('service_date', { ascending: false })
    .limit(200);

  const { data: documents } = await supabase
    .from('documents')
    .select('id, title, category, file_name, public_url, vehicle:vehicles(id, make, model, year)')
    .eq('owner_id', ownerId)
    .limit(200);

  return (
    <AppLayout>
      <SearchClient fleet={fleet || []} maintenance={(maintenance || []) as any} documents={(documents || []) as any} />
    </AppLayout>
  );
}
