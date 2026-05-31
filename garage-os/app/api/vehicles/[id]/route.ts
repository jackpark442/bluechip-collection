import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient as createClient } from '@/lib/supabase/route-client';

// GET /api/vehicles/[id]
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await supabase
    .from('vehicles').select('*').eq('id', params.id).eq('owner_id', user.id).single();
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/vehicles/[id]
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from('vehicles').update(body).eq('id', params.id).eq('owner_id', user.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/vehicles/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { error } = await supabase
    .from('vehicles').delete().eq('id', params.id).eq('owner_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
