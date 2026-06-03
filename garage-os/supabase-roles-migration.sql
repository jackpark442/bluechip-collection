-- ============================================================
-- USER ROLES — Migration
-- ============================================================

-- Add role column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'client'
  CHECK (role IN ('admin', 'client'));

-- Add admin_id so client profiles link back to their admin
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Set your own account as admin — replace with your actual user ID from Supabase Auth
-- You can find it in Supabase → Authentication → Users
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR-USER-ID-HERE';
