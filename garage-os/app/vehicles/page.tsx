import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import FleetClient from '@/components/vehicles/FleetClient';

export default async function VehiclesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: fleet } = await supabase
    .from('fleet_overview')
    .select('*')
    .eq('owner_id', user.id)
    .order('make', { ascending: true });

  return (
    <AppLayout>
      <FleetClient fleet={fleet || []} />
    </AppLayout>
  );
}
