import { createClient } from './server';

/**
 * Returns the effective owner_id to use in queries.
 * - For admin users: their own user ID
 * - For client users: their linked admin's ID
 */
export async function getEffectiveOwnerId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, admin_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role === 'client' && profile?.admin_id) {
    return profile.admin_id;
  }

  return user.id;
}
