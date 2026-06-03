-- ============================================================
-- VEHICLE PAPERWORK CHECKLIST — Migration
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS has_v5c             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_service_book     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_owners_manual    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_spare_key        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_purchase_invoice BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_warranty_docs    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_mot_certificates BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_insurance_cert   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_stamped_history  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_toolkit          BOOLEAN DEFAULT FALSE;
