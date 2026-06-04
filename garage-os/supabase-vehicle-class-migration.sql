-- Add new vehicle categories for non-road and commercial vehicles
-- Run this in Supabase SQL Editor

ALTER TYPE vehicle_category ADD VALUE IF NOT EXISTS 'pushbike';
ALTER TYPE vehicle_category ADD VALUE IF NOT EXISTS 'lawnmower';
ALTER TYPE vehicle_category ADD VALUE IF NOT EXISTS 'plant_equipment';
ALTER TYPE vehicle_category ADD VALUE IF NOT EXISTS 'quad_bike';
ALTER TYPE vehicle_category ADD VALUE IF NOT EXISTS 'hgv';
