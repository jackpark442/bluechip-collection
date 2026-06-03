import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteClient } from '@/lib/supabase/route-client';

export async function POST(request: NextRequest) {
  // Verify the requesting user is an admin
  const supabase = createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { email, password, fullName } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // Use service role to create the account
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification
  });

  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message ?? 'Failed to create user' }, { status: 500 });
  }

  // Upsert profile with role = client and link to admin
  const { error: profileError } = await adminClient.from('profiles').upsert({
    id: newUser.user.id,
    email,
    full_name: fullName?.trim() || null,
    role: 'client',
    admin_id: user.id,
  });

  if (profileError) {
    // Clean up the auth user if profile creation failed
    await adminClient.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId: newUser.user.id });
}
