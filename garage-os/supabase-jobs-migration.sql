-- ============================================================
-- VEHICLE JOBS / TASK LIST — Migration
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TYPE job_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE job_status   AS ENUM ('todo', 'in_progress', 'done');

CREATE TABLE vehicle_jobs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  title         TEXT NOT NULL,
  description   TEXT,
  priority      job_priority NOT NULL DEFAULT 'medium',
  status        job_status   NOT NULL DEFAULT 'todo',
  due_date      DATE,
  requested_by  TEXT,          -- free-text: "Owner", "Client - John", etc.
  completed_at  TIMESTAMPTZ,

  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own vehicle jobs" ON vehicle_jobs
  FOR ALL USING (auth.uid() = owner_id);

CREATE INDEX idx_vehicle_jobs_vehicle ON vehicle_jobs(vehicle_id);
CREATE INDEX idx_vehicle_jobs_status  ON vehicle_jobs(vehicle_id, status);

CREATE TRIGGER vehicle_jobs_updated_at
  BEFORE UPDATE ON vehicle_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
