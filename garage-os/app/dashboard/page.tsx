import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Fetch fleet overview
  const { data: fleet } = await supabase
    .from('fleet_overview')
    .select('*')
    .eq('owner_id', user.id);

  // Fetch upcoming reminders
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*, vehicle:vehicles(id, make, model, year, registration, cover_image_url)')
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(8);

  // Recent maintenance
  const { data: recentMaintenance } = await supabase
    .from('maintenance_records')
    .select('*, vehicle:vehicles(id, make, model, year)')
    .eq('owner_id', user.id)
    .order('service_date', { ascending: false })
    .limit(5);

  // YTD maintenance cost
  const currentYear = new Date().getFullYear();
  const { data: ytdCosts } = await supabase
    .from('maintenance_records')
    .select('total_cost')
    .eq('owner_id', user.id)
    .gte('service_date', `${currentYear}-01-01`);

  const ytdTotal = ytdCosts?.reduce((sum, r) => sum + (r.total_cost || 0), 0) || 0;

  return (
    <AppLayout>
      <DashboardClient
        fleet={fleet || []}
        reminders={(reminders || []) as any}
        recentMaintenance={(recentMaintenance || []) as any}
        ytdMaintenanceCost={ytdTotal}
        userId={user.id}
      />
    </AppLayout>
  );
}
