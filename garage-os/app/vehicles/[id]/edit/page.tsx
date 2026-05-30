import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import VehicleForm from '@/components/vehicles/VehicleForm';

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: vehicle } = await supabase
    .from('vehicles').select('*').eq('id', params.id).eq('owner_id', user.id).single();
  if (!vehicle) notFound();

  return (
    <AppLayout>
      <VehicleForm mode="edit" vehicle={vehicle} />
    </AppLayout>
  );
}
