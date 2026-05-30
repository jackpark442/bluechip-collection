import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RemindersClient from '@/components/RemindersClient';

export default async function RemindersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*, vehicle:vehicles(id, make, model, year, registration, cover_image_url, category)')
    .eq('owner_id', user.id)
    .order('due_date', { ascending: true });

  return (
    <AppLayout>
      <RemindersClient reminders={(reminders || []) as any} />
    </AppLayout>
  );
}
