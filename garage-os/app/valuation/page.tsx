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

  // Fetch maintenance totals per vehicle
  const { data: maintenanceData } = await supabase
    .from('maintenance_records')
    .select('vehicle_id, total_cost')
    .eq('owner_id', user.id);

  // Sum maintenance costs per vehicle
  const maintenanceTotals: Record<string, number> = {};
  (maintenanceData || []).forEach(r => {
    maintenanceTotals[r.vehicle_id] = (maintenanceTotals[r.vehicle_id] || 0) + (r.total_cost || 0);
  });

  // Merge maintenance totals into fleet
  const fleetWithMaintenance = (fleet || []).map(v => ({
    ...v,
    total_maintenance_cost: maintenanceTotals[v.id] || 0,
  }));

  return (
    <AppLayout>
      <ValuationClient fleet={fleetWithMaintenance} valuations={(valuations || []) as any} />
    </AppLayout>
  );
}
