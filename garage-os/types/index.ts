// ============================================================
// GARAGE OS — TypeScript Types
// ============================================================

export type VehicleCategory =
  | 'supercar' | 'sports_car' | 'classic_car' | 'luxury_saloon'
  | 'suv' | 'motorhome' | 'campervan' | 'motorcycle' | 'van'
  | 'pickup_truck' | 'trailer' | 'other';

export type VehicleStatus = 'active' | 'stored' | 'restoration' | 'for_sale' | 'sold' | 'written_off';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | 'hydrogen' | 'other';
export type MotResult = 'pass' | 'fail' | 'advisory' | 'pending';
export type InsuranceType = 'third_party' | 'third_party_fire_theft' | 'comprehensive' | 'classic_agreed_value' | 'fleet' | 'motor_trade';
export type ServiceType = 'full_service' | 'interim_service' | 'oil_change' | 'tyre_change' | 'brake_service' | 'timing_belt' | 'bodywork' | 'detailing' | 'electrical' | 'suspension' | 'transmission' | 'engine_rebuild' | 'restoration' | 'inspection' | 'recall' | 'other';
export type DocumentCategory = 'v5c_logbook' | 'mot_certificate' | 'insurance_certificate' | 'tax_document' | 'service_invoice' | 'purchase_invoice' | 'warranty' | 'manual' | 'history_report' | 'valuation_report' | 'modification_certificate' | 'import_document' | 'other';
export type ReminderType = 'mot_due' | 'insurance_due' | 'tax_due' | 'service_due' | 'tyre_check' | 'fluid_check' | 'custom';
export type ReminderStatus = 'pending' | 'acknowledged' | 'completed' | 'snoozed';
export type KeyType = 'main' | 'spare' | 'valet' | 'other';
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';
export type JobStatus = 'todo' | 'in_progress' | 'done';

export interface VehicleJob {
  id: string;
  vehicle_id?: string; // nullable — general jobs have no vehicle
  owner_id: string;
  title: string;
  description?: string;
  priority: JobPriority;
  status: JobStatus;
  due_date?: string;
  requested_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'registration'>;
  logs?: JobLog[];
}

export interface JobLog {
  id: string;
  job_id: string;
  owner_id: string;
  log_date: string;
  notes: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  registration?: string;
  vin?: string;
  colour?: string;
  category: VehicleCategory;
  status: VehicleStatus;
  fuel_type?: FuelType;
  engine_size_cc?: number;
  horsepower?: number;
  torque_nm?: number;
  transmission?: string;
  drive_type?: string;
  mileage: number;
  purchase_price?: number;
  purchase_date?: string;
  current_value?: number;
  last_valued_date?: string;
  cover_image_url?: string;
  notes?: string;
  first_mot_due_date?: string;
  // Paperwork checklist
  has_v5c?: boolean;
  has_service_book?: boolean;
  has_owners_manual?: boolean;
  has_spare_key?: boolean;
  has_purchase_invoice?: boolean;
  has_warranty_docs?: boolean;
  has_mot_certificates?: boolean;
  has_insurance_cert?: boolean;
  has_stamped_history?: boolean;
  has_toolkit?: boolean;
  location_name?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  // Extended performance specs
  zero_to_sixty?: number;
  top_speed_mph?: number;
  kerb_weight_kg?: number;
  body_style?: string;
  seats?: number;
  cylinders?: number;
  co2_gkm?: number;
  wheelbase_mm?: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  owner_id: string;
  storage_path: string;
  public_url: string;
  caption?: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

export interface MotRecord {
  id: string;
  vehicle_id: string;
  owner_id: string;
  test_date?: string;
  expiry_date: string;
  result: MotResult;
  mileage_at_test?: number;
  certificate_number?: string;
  test_centre?: string;
  advisories?: string[];
  failures?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InsurancePolicy {
  id: string;
  vehicle_id: string;
  owner_id: string;
  provider: string;
  policy_number?: string;
  type: InsuranceType;
  start_date: string;
  end_date: string;
  annual_premium?: number;
  agreed_value?: number;
  excess?: number;
  broker?: string;
  broker_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VehicleTax {
  id: string;
  vehicle_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  amount?: number;
  reference?: string;
  is_exempt: boolean;
  exemption_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  owner_id: string;
  service_type: ServiceType;
  title: string;
  description?: string;
  service_date: string;
  mileage_at_service?: number;
  labour_cost: number;
  parts_cost: number;
  total_cost: number;
  workshop?: string;
  technician?: string;
  invoice_number?: string;
  next_service_date?: string;
  next_service_mileage?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  vehicle_id: string;
  owner_id: string;
  category: DocumentCategory;
  title: string;
  description?: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  related_mot_id?: string;
  related_insurance_id?: string;
  related_maintenance_id?: string;
  created_at: string;
}

export interface VehicleKey {
  id: string;
  vehicle_id: string;
  owner_id: string;
  key_type: KeyType;
  label?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  vehicle_id?: string;
  owner_id: string;
  type: ReminderType;
  title: string;
  description?: string;
  due_date: string;
  status: ReminderStatus;
  related_mot_id?: string;
  related_insurance_id?: string;
  related_tax_id?: string;
  related_maintenance_id?: string;
  notify_days_before: number[];
  last_notified_at?: string;
  snoozed_until?: string;
  created_at: string;
  updated_at: string;
  // Joined
  vehicle?: Pick<Vehicle, 'id' | 'make' | 'model' | 'year' | 'registration' | 'cover_image_url'>;
}

export interface Valuation {
  id: string;
  vehicle_id: string;
  owner_id: string;
  valuation_date: string;
  value: number;
  source?: string;
  notes?: string;
  created_at: string;
}

// Fleet overview from the DB view
export interface FleetOverview extends Vehicle {
  mot_expiry?: string;
  mot_result?: MotResult;
  insurance_expiry?: string;
  insurance_provider?: string;
  tax_expiry?: string;
  tax_exempt?: boolean;
  tax_exemption_reason?: string;
  days_to_nearest_expiry?: number;
  first_mot_due_date?: string;
}

// Dashboard stats
export interface FleetStats {
  total_vehicles: number;
  active_vehicles: number;
  stored_vehicles: number;
  total_value: number;
  total_purchase_value: number;
  vehicles_expiring_soon: number;  // < 30 days
  vehicles_expired: number;
  upcoming_reminders: number;
  total_maintenance_cost_ytd: number;
  by_category: { category: VehicleCategory; count: number }[];
}
