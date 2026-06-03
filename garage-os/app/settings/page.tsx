import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single();

  // Fetch client accounts linked to this admin
  const { data: clients } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .eq('admin_id', user.id)
    .eq('role', 'client');

  return (
    <AppLayout>
      <SettingsClient user={user} profile={profile} clients={clients || []} />
    </AppLayout>
  );
}
