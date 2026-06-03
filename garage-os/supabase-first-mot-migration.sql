-- Add first MOT due date for new vehicles with no MOT history
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS first_mot_due_date DATE;
