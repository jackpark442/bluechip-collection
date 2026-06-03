import { createClient } from '@/lib/supabase/server';
import { getEffectiveOwnerId } from '@/lib/supabase/get-owner-id';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) redirect('/auth/login');

  // Fetch fleet overview
  const { data: fleet } = await supabase
    .from('fleet_overview')
    .select('*')
    .eq('owner_id', ownerId);

  // Fetch upcoming reminders
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*, vehicle:vehicles(id, make, model, year, registration, cover_image_url)')
    .eq('owner_id', ownerId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(8);

  // Recent maintenance
  const { data: recentMaintenance } = await supabase
    .from('maintenance_records')
    .select('*, vehicle:vehicles(id, make, model, year)')
    .eq('owner_id', ownerId)
    .order('service_date', { ascending: false })
    .limit(5);

  // YTD maintenance cost
  const currentYear = new Date().getFullYear();
  const { data: ytdCosts } = await supabase
    .from('maintenance_records')
    .select('total_cost')
    .eq('owner_id', ownerId)
    .gte('service_date', `${currentYear}-01-01`);

  const ytdTotal = ytdCosts?.reduce((sum, r) => sum + (r.total_cost || 0), 0) || 0;

  // All open jobs with vehicle info and recent logs
  const { data: openJobs } = await supabase
    .from('vehicle_jobs')
    .select('*, vehicle:vehicles(id, make, model, year, registration), logs:job_logs(*)')
    .eq('owner_id', ownerId)
    .neq('status', 'done')
    .order('created_at', { ascending: false });

  return (
    <AppLayout>
      <DashboardClient
        fleet={fleet || []}
        reminders={(reminders || []) as any}
        recentMaintenance={(recentMaintenance || []) as any}
        ytdMaintenanceCost={ytdTotal}
        userId={user.id}
        openJobs={(openJobs || []) as any}
      />
    </AppLayout>
  );
}
