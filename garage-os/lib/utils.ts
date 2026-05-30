import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, format, parseISO } from 'date-fns';
import type { VehicleCategory, VehicleStatus, ReminderType, ServiceType, DocumentCategory } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency = 'GBP'): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export function formatMileage(miles: number | null | undefined): string {
  if (miles == null) return '—';
  return new Intl.NumberFormat('en-GB').format(miles) + ' mi';
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return null;
  }
}

export function getExpiryStatus(dateStr: string | null | undefined): 'expired' | 'critical' | 'warning' | 'ok' | 'unknown' {
  const days = daysUntil(dateStr);
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'ok';
}

export function getExpiryColor(status: ReturnType<typeof getExpiryStatus>): string {
  switch (status) {
    case 'expired': return 'text-red-400';
    case 'critical': return 'text-red-400';
    case 'warning': return 'text-amber-400';
    case 'ok': return 'text-emerald-400';
    default: return 'text-chrome-dim';
  }
}

export function getExpiryBadgeColor(status: ReturnType<typeof getExpiryStatus>): string {
  switch (status) {
    case 'expired': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'warning': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'ok': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    default: return 'bg-obsidian-500/50 text-chrome-dim border-white/5';
  }
}

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  supercar: 'Supercar',
  sports_car: 'Sports Car',
  classic_car: 'Classic Car',
  luxury_saloon: 'Luxury Saloon',
  suv: 'SUV',
  motorhome: 'Motorhome',
  campervan: 'Campervan',
  motorcycle: 'Motorcycle',
  van: 'Van',
  pickup_truck: 'Pickup Truck',
  trailer: 'Trailer',
  other: 'Other',
};

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Active',
  stored: 'Stored',
  restoration: 'Restoration',
  for_sale: 'For Sale',
  sold: 'Sold',
  written_off: 'Written Off',
};

export const STATUS_COLORS: Record<VehicleStatus, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stored: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  restoration: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  for_sale: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  sold: 'bg-chrome-muted/20 text-chrome-dim border-white/10',
  written_off: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  full_service: 'Full Service',
  interim_service: 'Interim Service',
  oil_change: 'Oil Change',
  tyre_change: 'Tyre Change',
  brake_service: 'Brake Service',
  timing_belt: 'Timing Belt',
  bodywork: 'Bodywork',
  detailing: 'Detailing',
  electrical: 'Electrical',
  suspension: 'Suspension',
  transmission: 'Transmission',
  engine_rebuild: 'Engine Rebuild',
  restoration: 'Restoration',
  inspection: 'Inspection',
  recall: 'Recall',
  other: 'Other',
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  v5c_logbook: 'V5C Logbook',
  mot_certificate: 'MOT Certificate',
  insurance_certificate: 'Insurance Certificate',
  tax_document: 'Tax Document',
  service_invoice: 'Service Invoice',
  purchase_invoice: 'Purchase Invoice',
  warranty: 'Warranty',
  manual: "Owner's Manual",
  history_report: 'History Report',
  valuation_report: 'Valuation Report',
  modification_certificate: 'Modification Certificate',
  import_document: 'Import Document',
  other: 'Other',
};

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  mot_due: 'MOT Due',
  insurance_due: 'Insurance Renewal',
  tax_due: 'Vehicle Tax Due',
  service_due: 'Service Due',
  tyre_check: 'Tyre Check',
  fluid_check: 'Fluid Check',
  custom: 'Custom Reminder',
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getVehicleDisplayName(vehicle: { make: string; model: string; year: number; variant?: string | null }): string {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ' ' + vehicle.variant : ''}`;
}

export const CATEGORY_EMOJI: Record<VehicleCategory, string> = {
  supercar: '🏎',
  sports_car: '🚗',
  classic_car: '🚘',
  luxury_saloon: '🚙',
  suv: '🚐',
  motorhome: '🚌',
  campervan: '🚐',
  motorcycle: '🏍',
  van: '🚐',
  pickup_truck: '🛻',
  trailer: '🚛',
  other: '🚗',
};
