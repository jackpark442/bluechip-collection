import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import VehicleForm from '@/components/vehicles/VehicleForm';

export default async function NewVehiclePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <AppLayout>
      <VehicleForm mode="create" />
    </AppLayout>
  );
}
