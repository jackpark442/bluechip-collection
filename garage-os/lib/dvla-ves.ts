/**
 * DVLA Vehicle Enquiry Service (VES) API
 * Docs: https://developer-portal.driver-vehicle-licensing.agency.gov.uk/api-documentation/vehicle-enquiry-service
 *
 * Instant API key — register at:
 * https://developer-portal.driver-vehicle-licensing.agency.gov.uk/
 *
 * Required environment variable:
 *   DVLA_API_KEY  – your VES API key
 *
 * Returns: make, colour, fuel type, MOT expiry, tax status, engine size, year.
 * Note: Does NOT include MOT test history or advisories — use DVSA for that.
 */

const VES_API_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';

export interface VesVehicleResponse {
  registrationNumber: string;
  make?: string;
  colour?: string;
  fuelType?: string;                // "PETROL", "DIESEL", "ELECTRIC", etc.
  motStatus?: string;               // "Valid", "Not valid", "No details held by DVLA"
  motExpiryDate?: string;           // "2025-06-15"
  taxStatus?: string;               // "Taxed", "SORN", "Untaxed"
  taxDueDate?: string;
  yearOfManufacture?: number;
  engineCapacity?: number;          // cc
  co2Emissions?: number;
  markedForExport?: boolean;
  typeApproval?: string;
  wheelplan?: string;
  monthOfFirstRegistration?: string; // "2019-03"
}

export interface VesLookupResult {
  success: true;
  source: 'dvla-ves';
  registration: string;
  make?: string;
  /** VES does not provide model — will be undefined */
  model?: string;
  colour?: string;
  fuelType?: string;
  engineSizeCc?: number;
  yearOfManufacture?: number;
  motExpiryDate?: string;
  firstMotDueDate?: string;   // calculated for vehicles with no MOT yet
  taxStatus?: string;
  taxDueDate?: string;
  monthOfFirstRegistration?: string;
}

export interface VesLookupError {
  success: false;
  source: 'dvla-ves';
  error: string;
  code?: string;
}

export async function lookupByRegistrationVes(
  registration: string
): Promise<VesLookupResult | VesLookupError> {
  const apiKey = process.env.DVLA_API_KEY;
  if (!apiKey) {
    return { success: false, source: 'dvla-ves', error: 'DVLA_API_KEY not configured', code: 'CONFIG_ERROR' };
  }

  const reg = registration.replace(/\s+/g, '').toUpperCase();
  if (!reg || reg.length < 2 || reg.length > 8) {
    return { success: false, source: 'dvla-ves', error: 'Invalid registration format', code: 'INVALID_REG' };
  }

  let res: Response;
  try {
    res = await fetch(VES_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ registrationNumber: reg }),
      next: { revalidate: 0 },
    });
  } catch (err: any) {
    return { success: false, source: 'dvla-ves', error: 'Network error reaching DVLA API', code: 'NETWORK_ERROR' };
  }

  if (res.status === 404) {
    return { success: false, source: 'dvla-ves', error: 'Vehicle not found in DVLA database', code: 'NOT_FOUND' };
  }

  if (res.status === 429) {
    return { success: false, source: 'dvla-ves', error: 'DVLA API rate limit reached. Please try again shortly.', code: 'RATE_LIMITED' };
  }

  if (res.status === 403) {
    return { success: false, source: 'dvla-ves', error: 'Invalid DVLA API key', code: 'AUTH_ERROR' };
  }

  if (!res.ok) {
    let msg = `DVLA VES API error ${res.status}`;
    try {
      const body = await res.json();
      const detail = body?.errors?.[0]?.detail ?? body?.message;
      if (detail) msg += `: ${detail}`;
    } catch {}
    return { success: false, source: 'dvla-ves', error: msg, code: `HTTP_${res.status}` };
  }

  let data: VesVehicleResponse;
  try {
    data = await res.json();
  } catch {
    return { success: false, source: 'dvla-ves', error: 'Invalid response from DVLA API', code: 'PARSE_ERROR' };
  }

  // Normalise fuel type to match our app's casing expectations
  const rawFuel = data.fuelType ?? '';
  const fuelMap: Record<string, string> = {
    PETROL: 'Petrol',
    DIESEL: 'Diesel',
    ELECTRIC: 'Electric',
    'HYBRID ELECTRIC': 'Hybrid Electric',
    'GAS/PETROL': 'Gas Bi-Fuel',
    'PETROL/GAS': 'Gas Bi-Fuel',
    GAS: 'LPG',
  };
  const normalisedFuel = fuelMap[rawFuel.toUpperCase()] ?? (rawFuel || undefined);

  // Calculate first MOT due date for vehicles with no MOT yet
  // UK rule: first MOT due 3 years after date of first registration
  let firstMotDueDate: string | undefined;
  if (!data.motExpiryDate && data.monthOfFirstRegistration) {
    try {
      // monthOfFirstRegistration is "YYYY-MM" e.g. "2023-09"
      const [y, m] = data.monthOfFirstRegistration.split('-').map(Number);
      const dueDate = new Date(y + 3, m - 1, 1); // first of the month, 3 years later
      firstMotDueDate = dueDate.toISOString().split('T')[0];
    } catch {}
  }

  return {
    success: true,
    source: 'dvla-ves',
    registration: data.registrationNumber ?? reg,
    make: data.make,
    model: undefined,
    colour: data.colour,
    fuelType: normalisedFuel,
    engineSizeCc: data.engineCapacity,
    yearOfManufacture: data.yearOfManufacture,
    motExpiryDate: data.motExpiryDate,
    firstMotDueDate,
    taxStatus: data.taxStatus,
    taxDueDate: data.taxDueDate,
    monthOfFirstRegistration: data.monthOfFirstRegistration,
  };
}
