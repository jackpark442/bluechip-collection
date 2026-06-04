-- Add location fields to fleet_overview view
-- Run this in Supabase SQL Editor

CREATE OR REPLACE VIEW fleet_overview AS
SELECT
  v.id,
  v.owner_id,
  v.make,
  v.model,
  v.variant,
  v.year,
  v.registration,
  v.category,
  v.status,
  v.mileage,
  v.current_value,
  v.cover_image_url,
  v.first_mot_due_date,

  -- Latest MOT
  COALESCE(mot.expiry_date, v.first_mot_due_date) AS mot_expiry,
  mot.result AS mot_result,

  -- Latest Insurance
  ins.end_date AS insurance_expiry,
  ins.provider AS insurance_provider,

  -- Latest Tax
  tax.end_date AS tax_expiry,
  tax.is_exempt AS tax_exempt,
  tax.exemption_reason AS tax_exemption_reason,

  -- Days until expiry
  LEAST(
    COALESCE(mot.expiry_date, v.first_mot_due_date) - CURRENT_DATE,
    ins.end_date - CURRENT_DATE,
    CASE WHEN tax.is_exempt THEN 9999 ELSE tax.end_date - CURRENT_DATE END
  ) AS days_to_nearest_expiry,

  -- Location (appended)
  v.purchase_price,
  v.location_name,
  v.location_address,
  v.location_lat,
  v.location_lng

FROM vehicles v
LEFT JOIN LATERAL (
  SELECT * FROM mot_records WHERE vehicle_id = v.id ORDER BY expiry_date DESC LIMIT 1
) mot ON true
LEFT JOIN LATERAL (
  SELECT * FROM insurance_policies WHERE vehicle_id = v.id ORDER BY end_date DESC LIMIT 1
) ins ON true
LEFT JOIN LATERAL (
  SELECT * FROM vehicle_tax WHERE vehicle_id = v.id ORDER BY end_date DESC LIMIT 1
) tax ON true;
