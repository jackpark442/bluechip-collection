import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import ValuationClient from '@/components/ValuationClient';

export default async function ValuationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: fleet } = await supabase
    .from('vehicles')
    .select('id, make, model, year, variant, category, status, purchase_price, current_value, last_valued_date, cover_image_url')
    .eq('owner_id', user.id)
    .order('current_value', { ascending: false });

  const { data: valuations } = await supabase
    .from('valuations')
    .select('*, vehicle:vehicles(id, make, model, year)')
    .eq('owner_id', user.id)
    .order('valuation_date', { ascending: false })
    .limit(50);

  return (
    <AppLayout>
      <ValuationClient fleet={fleet || []} valuations={(valuations || []) as any} />
    </AppLayout>
  );
}
