-- Extended technical specifications
-- Run this in Supabase SQL Editor

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS zero_to_sixty    DECIMAL(4,2),   -- seconds
  ADD COLUMN IF NOT EXISTS top_speed_mph    INTEGER,
  ADD COLUMN IF NOT EXISTS kerb_weight_kg   INTEGER,
  ADD COLUMN IF NOT EXISTS body_style       TEXT,
  ADD COLUMN IF NOT EXISTS seats            INTEGER,
  ADD COLUMN IF NOT EXISTS cylinders        INTEGER,
  ADD COLUMN IF NOT EXISTS co2_gkm          INTEGER,
  ADD COLUMN IF NOT EXISTS wheelbase_mm     INTEGER,
  ADD COLUMN IF NOT EXISTS length_mm        INTEGER,
  ADD COLUMN IF NOT EXISTS width_mm         INTEGER,
  ADD COLUMN IF NOT EXISTS height_mm        INTEGER;
