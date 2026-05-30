import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/images/upload
// multipart/form-data: vehicleId, file, caption?, isCover?
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const vehicleId = formData.get('vehicleId') as string;
  const caption = formData.get('caption') as string | null;
  const isCover = formData.get('isCover') === 'true';

  if (!file || !vehicleId) {
    return NextResponse.json({ error: 'Missing file or vehicleId' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
  }

  const storagePath = `${user.id}/${vehicleId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('vehicle-images')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from('vehicle-images')
    .getPublicUrl(storagePath);

  // If this is marked as cover, unset any existing cover first
  if (isCover) {
    await supabase.from('vehicle_images')
      .update({ is_cover: false })
      .eq('vehicle_id', vehicleId)
      .eq('owner_id', user.id);
  }

  const { data: image, error: dbError } = await supabase
    .from('vehicle_images')
    .insert({
      vehicle_id: vehicleId,
      owner_id: user.id,
      storage_path: storagePath,
      public_url: publicUrl,
      caption: caption ?? null,
      is_cover: isCover,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from('vehicle-images').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // If it's the cover image, also update vehicles table
  if (isCover) {
    await supabase.from('vehicles')
      .update({ cover_image_url: publicUrl })
      .eq('id', vehicleId)
      .eq('owner_id', user.id);
  }

  return NextResponse.json(image, { status: 201 });
}

// DELETE /api/images/upload?imageId=xxx
export async function DELETE(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const imageId = request.nextUrl.searchParams.get('imageId');
  if (!imageId) return NextResponse.json({ error: 'Missing imageId' }, { status: 400 });

  const { data: image } = await supabase
    .from('vehicle_images').select('*').eq('id', imageId).eq('owner_id', user.id).single();
  if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabase.storage.from('vehicle-images').remove([image.storage_path]);
  await supabase.from('vehicle_images').delete().eq('id', imageId);

  // If we deleted the cover, try to set the next image as cover
  if (image.is_cover) {
    const { data: next } = await supabase
      .from('vehicle_images').select('*').eq('vehicle_id', image.vehicle_id).limit(1).single();
    if (next) {
      await supabase.from('vehicle_images').update({ is_cover: true }).eq('id', next.id);
      await supabase.from('vehicles').update({ cover_image_url: next.public_url }).eq('id', image.vehicle_id);
    } else {
      await supabase.from('vehicles').update({ cover_image_url: null }).eq('id', image.vehicle_id);
    }
  }

  return NextResponse.json({ ok: true });
}
