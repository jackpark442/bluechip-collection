import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route-client';

// Returns the effective owner_id (admin's ID for client users)
async function getOwnerIdForUpload(supabase: ReturnType<typeof createRouteClient>, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, admin_id')
    .eq('id', userId)
    .maybeSingle();
  if (profile?.role === 'client' && profile?.admin_id) return profile.admin_id;
  return userId;
}

// POST /api/images/upload
export async function POST(request: NextRequest) {
  const supabase = createRouteClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const ownerId = await getOwnerIdForUpload(supabase, user.id);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const vehicleId = formData.get('vehicleId') as string;
  const caption = formData.get('caption') as string | null;
  const isCover = formData.get('isCover') === 'true';

  if (!file || !vehicleId) {
    return NextResponse.json({ error: 'Missing file or vehicleId' }, { status: 400 });
  }

  // Accept image/* broadly — including HEIC from iPhones
  if (!file.type.startsWith('image/') && file.type !== 'application/octet-stream') {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large — maximum 50MB' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${ownerId}/${vehicleId}/${Date.now()}-${safeName}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('vehicle-images')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error('[images/upload] storage error:', uploadError.message);
    return NextResponse.json({ error: `Storage error: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(storagePath);

  if (isCover) {
    await supabase.from('vehicle_images')
      .update({ is_cover: false })
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', ownerId);
  }

  // Get next sort_order
  const { count } = await supabase
    .from('vehicle_images')
    .select('*', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId);

  const { data: image, error: dbError } = await supabase
    .from('vehicle_images')
    .insert({
      vehicle_id: vehicleId,
      owner_id: ownerId,
      storage_path: storagePath,
      public_url: publicUrl,
      caption: caption ?? null,
      is_cover: isCover,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (dbError) {
    console.error('[images/upload] db error:', dbError.message);
    await supabase.storage.from('vehicle-images').remove([storagePath]);
    return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
  }

  if (isCover) {
    await supabase.from('vehicles')
      .update({ cover_image_url: publicUrl })
      .eq('id', vehicleId)
      .eq('owner_id', ownerId);
  }

  return NextResponse.json(image, { status: 201 });
}

// PATCH /api/images/upload?imageId=xxx&setCover=true
export async function PATCH(request: NextRequest) {
  const supabase = createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const ownerId = await getOwnerIdForUpload(supabase, user.id);
  const imageId = request.nextUrl.searchParams.get('imageId');
  if (!imageId) return NextResponse.json({ error: 'Missing imageId' }, { status: 400 });

  const { data: image } = await supabase
    .from('vehicle_images').select('*').eq('id', imageId).single();
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase.from('vehicle_images').update({ is_cover: false }).eq('vehicle_id', image.vehicle_id);
  await supabase.from('vehicle_images').update({ is_cover: true }).eq('id', imageId);
  await supabase.from('vehicles').update({ cover_image_url: image.public_url }).eq('id', image.vehicle_id).eq('owner_id', ownerId);

  return NextResponse.json({ ok: true });
}

// DELETE /api/images/upload?imageId=xxx
export async function DELETE(request: NextRequest) {
  const supabase = createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const ownerId = await getOwnerIdForUpload(supabase, user.id);
  const imageId = request.nextUrl.searchParams.get('imageId');
  if (!imageId) return NextResponse.json({ error: 'Missing imageId' }, { status: 400 });

  const { data: image } = await supabase
    .from('vehicle_images').select('*').eq('id', imageId).single();
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase.storage.from('vehicle-images').remove([image.storage_path]);
  await supabase.from('vehicle_images').delete().eq('id', imageId);

  if (image.is_cover) {
    const { data: next } = await supabase
      .from('vehicle_images').select('*').eq('vehicle_id', image.vehicle_id).limit(1).single();
    if (next) {
      await supabase.from('vehicle_images').update({ is_cover: true }).eq('id', next.id);
      await supabase.from('vehicles').update({ cover_image_url: next.public_url }).eq('id', image.vehicle_id).eq('owner_id', ownerId);
    } else {
      await supabase.from('vehicles').update({ cover_image_url: null }).eq('id', image.vehicle_id).eq('owner_id', ownerId);
    }
  }

  return NextResponse.json({ ok: true });
}
