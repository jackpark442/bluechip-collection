import { createClient } from '@/lib/supabase/server';
import { getEffectiveOwnerId } from '@/lib/supabase/get-owner-id';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import RemindersClient from '@/components/RemindersClient';

export default async function RemindersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const ownerId = await getEffectiveOwnerId();
  if (!ownerId) redirect('/auth/login');

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*, vehicle:vehicles(id, make, model, year, registration, cover_image_url, category)')
    .eq('owner_id', ownerId)
    .order('due_date', { ascending: true });

  return (
    <AppLayout>
      <RemindersClient reminders={(reminders || []) as any} />
    </AppLayout>
  );
}
