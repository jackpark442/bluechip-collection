import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient as createClient } from '@/lib/supabase/route-client';

// POST /api/documents/upload
// multipart/form-data: vehicleId, category, title, file
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const vehicleId = formData.get('vehicleId') as string;
  const category = formData.get('category') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;

  if (!file || !vehicleId || !category || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Upload to Supabase Storage
  const storagePath = `${user.id}/${vehicleId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('vehicle-documents')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get signed URL (documents bucket is private)
  const signedUrlResult = await supabase.storage
    .from('vehicle-documents')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year

  const signedUrl = signedUrlResult.data?.signedUrl ?? '';

  // Insert document record
  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .insert({
      vehicle_id: vehicleId,
      owner_id: user.id,
      category,
      title,
      description: description ?? null,
      storage_path: storagePath,
      public_url: signedUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from('vehicle-documents').remove([storagePath]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json(doc, { status: 201 });
}
