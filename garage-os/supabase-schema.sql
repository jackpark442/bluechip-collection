-- ============================================================
-- GARAGE OS — Complete Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TYPE vehicle_category AS ENUM (
  'supercar', 'sports_car', 'classic_car', 'luxury_saloon',
  'suv', 'motorhome', 'campervan', 'motorcycle', 'van',
  'pickup_truck', 'trailer', 'other'
);

CREATE TYPE vehicle_status AS ENUM (
  'active', 'stored', 'restoration', 'for_sale', 'sold', 'written_off'
);

CREATE TYPE fuel_type AS ENUM (
  'petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'hydrogen', 'other'
);

CREATE TABLE vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Identity
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  variant TEXT,
  year INTEGER NOT NULL,
  registration TEXT,
  vin TEXT,
  colour TEXT,
  
  -- Classification
  category vehicle_category NOT NULL DEFAULT 'other',
  status vehicle_status NOT NULL DEFAULT 'active',
  fuel_type fuel_type DEFAULT 'petrol',
  
  -- Technical
  engine_size_cc INTEGER,
  horsepower INTEGER,
  torque_nm INTEGER,
  transmission TEXT,
  drive_type TEXT,
  mileage INTEGER DEFAULT 0,
  
  -- Financial
  purchase_price DECIMAL(12,2),
  purchase_date DATE,
  current_value DECIMAL(12,2),
  last_valued_date DATE,
  
  -- Media
  cover_image_url TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own vehicles" ON vehicles FOR ALL USING (auth.uid() = owner_id);

CREATE INDEX idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX idx_vehicles_category ON vehicles(category);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- ============================================================
-- VEHICLE IMAGES
-- ============================================================
CREATE TABLE vehicle_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  caption TEXT,
  is_cover BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own vehicle images" ON vehicle_images FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_vehicle_images_vehicle ON vehicle_images(vehicle_id);

-- ============================================================
-- MOT RECORDS
-- ============================================================
CREATE TYPE mot_result AS ENUM ('pass', 'fail', 'advisory', 'pending');

CREATE TABLE mot_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  test_date DATE,
  expiry_date DATE NOT NULL,
  result mot_result DEFAULT 'pending',
  mileage_at_test INTEGER,
  certificate_number TEXT,
  test_centre TEXT,
  advisories TEXT[],
  failures TEXT[],
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mot_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own MOT records" ON mot_records FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_mot_vehicle ON mot_records(vehicle_id);

-- ============================================================
-- INSURANCE POLICIES
-- ============================================================
CREATE TYPE insurance_type AS ENUM (
  'third_party', 'third_party_fire_theft', 'comprehensive',
  'classic_agreed_value', 'fleet', 'motor_trade'
);

CREATE TABLE insurance_policies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  provider TEXT NOT NULL,
  policy_number TEXT,
  type insurance_type DEFAULT 'comprehensive',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  annual_premium DECIMAL(10,2),
  agreed_value DECIMAL(12,2),
  excess DECIMAL(8,2),
  broker TEXT,
  broker_phone TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own insurance" ON insurance_policies FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_insurance_vehicle ON insurance_policies(vehicle_id);

-- ============================================================
-- VEHICLE TAX (Road Tax / VED)
-- ============================================================
CREATE TABLE vehicle_tax (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount DECIMAL(8,2),
  reference TEXT,
  is_exempt BOOLEAN DEFAULT FALSE,
  exemption_reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicle_tax ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own vehicle tax" ON vehicle_tax FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_tax_vehicle ON vehicle_tax(vehicle_id);

-- ============================================================
-- MAINTENANCE & SERVICE HISTORY
-- ============================================================
CREATE TYPE service_type AS ENUM (
  'full_service', 'interim_service', 'oil_change', 'tyre_change',
  'brake_service', 'timing_belt', 'bodywork', 'detailing',
  'electrical', 'suspension', 'transmission', 'engine_rebuild',
  'restoration', 'inspection', 'recall', 'other'
);

CREATE TABLE maintenance_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  service_type service_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  service_date DATE NOT NULL,
  mileage_at_service INTEGER,
  
  -- Costs
  labour_cost DECIMAL(10,2) DEFAULT 0,
  parts_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (labour_cost + parts_cost) STORED,
  
  -- Provider
  workshop TEXT,
  technician TEXT,
  invoice_number TEXT,
  
  -- Scheduling
  next_service_date DATE,
  next_service_mileage INTEGER,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own maintenance" ON maintenance_records FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_date ON maintenance_records(service_date DESC);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TYPE document_category AS ENUM (
  'v5c_logbook', 'mot_certificate', 'insurance_certificate',
  'tax_document', 'service_invoice', 'purchase_invoice',
  'warranty', 'manual', 'history_report', 'valuation_report',
  'modification_certificate', 'import_document', 'other'
);

CREATE TABLE documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  category document_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Link to related records
  related_mot_id UUID REFERENCES mot_records(id) ON DELETE SET NULL,
  related_insurance_id UUID REFERENCES insurance_policies(id) ON DELETE SET NULL,
  related_maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own documents" ON documents FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_documents_vehicle ON documents(vehicle_id);
CREATE INDEX idx_documents_category ON documents(category);

-- ============================================================
-- REMINDERS
-- ============================================================
CREATE TYPE reminder_type AS ENUM (
  'mot_due', 'insurance_due', 'tax_due', 'service_due',
  'tyre_check', 'fluid_check', 'custom'
);

CREATE TYPE reminder_status AS ENUM ('pending', 'acknowledged', 'completed', 'snoozed');

CREATE TABLE reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  type reminder_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status reminder_status DEFAULT 'pending',
  
  -- Auto-generated from related records
  related_mot_id UUID REFERENCES mot_records(id) ON DELETE CASCADE,
  related_insurance_id UUID REFERENCES insurance_policies(id) ON DELETE CASCADE,
  related_tax_id UUID REFERENCES vehicle_tax(id) ON DELETE CASCADE,
  related_maintenance_id UUID REFERENCES maintenance_records(id) ON DELETE CASCADE,
  
  -- Notification settings
  notify_days_before INTEGER[] DEFAULT '{30, 14, 7, 1}',
  last_notified_at TIMESTAMPTZ,
  snoozed_until DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own reminders" ON reminders FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_reminders_owner ON reminders(owner_id);
CREATE INDEX idx_reminders_due ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- ============================================================
-- VALUATIONS HISTORY
-- ============================================================
CREATE TABLE valuations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  valuation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value DECIMAL(12,2) NOT NULL,
  source TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own valuations" ON valuations FOR ALL USING (auth.uid() = owner_id);
CREATE INDEX idx_valuations_vehicle ON valuations(vehicle_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these separately in Supabase Dashboard > Storage

-- CREATE BUCKET vehicle-images (public)
-- CREATE BUCKET vehicle-documents (private)

-- Storage policies (run in SQL editor after creating buckets):
/*
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-images', 'vehicle-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-documents', 'vehicle-documents', false);

CREATE POLICY "Auth users can upload vehicle images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Vehicle images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "Auth users can delete own vehicle images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth users can read own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Auth users can delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vehicle-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
*/

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER mot_updated_at BEFORE UPDATE ON mot_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER insurance_updated_at BEFORE UPDATE ON insurance_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tax_updated_at BEFORE UPDATE ON vehicle_tax FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER maintenance_updated_at BEFORE UPDATE ON maintenance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reminders_updated_at BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create reminders when MOT is added/updated
CREATE OR REPLACE FUNCTION sync_mot_reminder()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing MOT reminder for this vehicle
  DELETE FROM reminders WHERE related_mot_id = NEW.id;
  
  -- Create new reminder
  INSERT INTO reminders (vehicle_id, owner_id, type, title, due_date, related_mot_id)
  VALUES (
    NEW.vehicle_id,
    NEW.owner_id,
    'mot_due',
    'MOT Due',
    NEW.expiry_date,
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mot_reminder_sync
  AFTER INSERT OR UPDATE ON mot_records
  FOR EACH ROW EXECUTE FUNCTION sync_mot_reminder();

-- Auto-create reminders when insurance is added/updated
CREATE OR REPLACE FUNCTION sync_insurance_reminder()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM reminders WHERE related_insurance_id = NEW.id;
  INSERT INTO reminders (vehicle_id, owner_id, type, title, due_date, related_insurance_id)
  VALUES (NEW.vehicle_id, NEW.owner_id, 'insurance_due', 'Insurance Renewal Due', NEW.end_date, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER insurance_reminder_sync
  AFTER INSERT OR UPDATE ON insurance_policies
  FOR EACH ROW EXECUTE FUNCTION sync_insurance_reminder();

-- Auto-create reminders when tax is added/updated
CREATE OR REPLACE FUNCTION sync_tax_reminder()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM reminders WHERE related_tax_id = NEW.id;
  IF NOT NEW.is_exempt THEN
    INSERT INTO reminders (vehicle_id, owner_id, type, title, due_date, related_tax_id)
    VALUES (NEW.vehicle_id, NEW.owner_id, 'tax_due', 'Vehicle Tax Due', NEW.end_date, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tax_reminder_sync
  AFTER INSERT OR UPDATE ON vehicle_tax
  FOR EACH ROW EXECUTE FUNCTION sync_tax_reminder();

-- ============================================================
-- VIEWS
-- ============================================================

-- Fleet overview with latest compliance status
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

  -- Latest MOT (falls back to first_mot_due_date for new vehicles)
  COALESCE(mot.expiry_date, v.first_mot_due_date) AS mot_expiry,
  mot.result AS mot_result,

  -- Latest Insurance
  ins.end_date AS insurance_expiry,
  ins.provider AS insurance_provider,

  -- Latest Tax
  tax.end_date AS tax_expiry,
  tax.is_exempt AS tax_exempt,

  -- Days until expiry
  LEAST(
    COALESCE(mot.expiry_date, v.first_mot_due_date) - CURRENT_DATE,
    ins.end_date - CURRENT_DATE,
    CASE WHEN tax.is_exempt THEN 9999 ELSE tax.end_date - CURRENT_DATE END
  ) AS days_to_nearest_expiry

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
