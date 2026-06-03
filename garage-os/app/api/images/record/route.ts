import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route-client';

async function getOwnerId(supabase: ReturnType<typeof createRouteClient>, userId: string) {
  const { data: profile } = await supabase
    .from('profiles').select('role, admin_id').eq('id', userId).maybeSingle();
  if (profile?.role === 'client' && profile?.admin_id) return profile.admin_id;
  return userId;
}

// POST — record an already-uploaded image in the database
export async function POST(request: NextRequest) {
  const supabase = createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const ownerId = await getOwnerId(supabase, user.id);
  const { vehicleId, storagePath, publicUrl, isCover, caption } = await request.json();

  if (!vehicleId || !storagePath || !publicUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (isCover) {
    await supabase.from('vehicle_images').update({ is_cover: false }).eq('vehicle_id', vehicleId).eq('owner_id', ownerId);
  }

  const { count } = await supabase
    .from('vehicle_images').select('*', { count: 'exact', head: true }).eq('vehicle_id', vehicleId);

  const { data: image, error } = await supabase
    .from('vehicle_images')
    .insert({
      vehicle_id: vehicleId,
      owner_id: ownerId,
      storage_path: storagePath,
      public_url: publicUrl,
      caption: caption ?? null,
      is_cover: isCover ?? false,
      sort_order: count ?? 0,
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isCover) {
    await supabase.from('vehicles').update({ cover_image_url: publicUrl }).eq('id', vehicleId).eq('owner_id', ownerId);
  }

  return NextResponse.json(image, { status: 201 });
}
