-- ============================================================
-- VEHICLE KEYS INVENTORY — Migration
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TYPE key_type AS ENUM ('main', 'spare', 'valet', 'other');

CREATE TABLE vehicle_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  key_type key_type NOT NULL DEFAULT 'main',
  label TEXT,       -- e.g. "Red fob", "Key 1"
  location TEXT,    -- e.g. "Key cabinet", "Safe", "Glove box"
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own vehicle keys" ON vehicle_keys FOR ALL USING (auth.uid() = owner_id);

CREATE INDEX idx_vehicle_keys_vehicle ON vehicle_keys(vehicle_id);

CREATE TRIGGER vehicle_keys_updated_at
  BEFORE UPDATE ON vehicle_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
