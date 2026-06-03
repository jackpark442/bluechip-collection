/**
 * DVSA MOT History API Integration
 * Official API: https://documentation.history.mot.api.gov.uk/
 *
 * Required environment variables:
 *   DVSA_CLIENT_ID        – from your DVSA registration email
 *   DVSA_CLIENT_SECRET    – from your DVSA registration email
 *   DVSA_API_KEY          – from your DVSA registration email
 *   DVSA_TOKEN_URL        – full URL including tenantId, e.g.
 *                           https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
 *   DVSA_SCOPE            – usually https://tapi.dvsa.gov.uk/.default
 *
 * The API requires an approved trade application. Register at:
 * https://documentation.history.mot.api.gov.uk/mot-history-api/register
 */

const DVSA_API_BASE = 'https://history.mot.api.gov.uk/v1/trade/vehicles';

// ── Token cache (in-memory, server-side) ─────────────────────────────────────
// Access tokens are valid 60 min; cache to avoid rate-limit issues.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60-second buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const tokenUrl = process.env.DVSA_TOKEN_URL;
  const clientId = process.env.DVSA_CLIENT_ID;
  const clientSecret = process.env.DVSA_CLIENT_SECRET;
  const scope = process.env.DVSA_SCOPE ?? 'https://tapi.dvsa.gov.uk/.default';

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error(
      'DVSA credentials not configured. Set DVSA_TOKEN_URL, DVSA_CLIENT_ID, DVSA_CLIENT_SECRET in .env.local'
    );
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  });

  let res: Response;
  try {
    res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch (err: any) {
    throw new Error(`DVSA token network error: ${err?.message ?? String(err)}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DVSA token request failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.value;
}

// ── Response types ────────────────────────────────────────────────────────────

export interface DvsaRfrItem {
  text: string;
  type: 'ADVISORY' | 'MINOR' | 'MAJOR' | 'DANGEROUS' | 'PRS';
  dangerous: boolean;
}

export interface DvsaMotTest {
  completedDate: string;         // "2024-01-15 09:30:00"
  testResult: 'PASSED' | 'FAILED';
  expiryDate?: string;           // "2025-01-15" — only present on PASSED
  odometerValue?: string;        // "45678"
  odometerUnit?: 'mi' | 'km';
  odometerResultType?: 'READ' | 'UNREADABLE' | 'NO_ODOMETER';
  motTestNumber?: string;
  rfrAndComments: DvsaRfrItem[];
}

export interface DvsaVehicleResponse {
  registration: string;
  make: string;
  model: string;
  firstUsedDate?: string;        // "2019-01-01"
  fuelType?: string;
  primaryColour?: string;
  vehicleId?: string;
  registrationDate?: string;
  manufactureDate?: string;
  engineSize?: string;           // "3902" (cc)
  motTests: DvsaMotTest[];
  // Raw error fields
  errorCode?: string;
  errorMessage?: string;
}

// ── Normalised result returned to our app ────────────────────────────────────

export interface MotLookupResult {
  success: true;
  registration: string;
  make: string;
  model: string;
  colour?: string;
  fuelType?: string;
  engineSizeCc?: number;
  firstUsedDate?: string;
  latestTest?: {
    testDate: string;
    expiryDate?: string;
    result: 'PASSED' | 'FAILED';
    mileage?: number;
    mileageUnit?: 'mi' | 'km';
    testNumber?: string;
    advisories: string[];
    failures: string[];
  };
  allTests: DvsaMotTest[];
}

export interface MotLookupError {
  success: false;
  error: string;
  code?: string;
}

// ── Main lookup function ──────────────────────────────────────────────────────

export async function lookupMotByRegistration(
  registration: string
): Promise<MotLookupResult | MotLookupError> {
  const apiKey = process.env.DVSA_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'DVSA_API_KEY not configured', code: 'CONFIG_ERROR' };
  }

  // Normalise: remove spaces, uppercase
  const reg = registration.replace(/\s+/g, '').toUpperCase();
  if (!reg || reg.length < 2 || reg.length > 8) {
    return { success: false, error: 'Invalid registration format', code: 'INVALID_REG' };
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Authentication failed', code: 'AUTH_ERROR' };
  }

  const url = `${DVSA_API_BASE}/registration/${encodeURIComponent(reg)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-API-Key': apiKey,
        Accept: 'application/json+v6',
      },
      next: { revalidate: 0 }, // never cache — always fresh
    });
  } catch (err: any) {
    return { success: false, error: 'Network error reaching DVSA API', code: 'NETWORK_ERROR' };
  }

  if (res.status === 404) {
    return { success: false, error: 'Vehicle not found in DVSA database', code: 'NOT_FOUND' };
  }

  if (res.status === 429) {
    return { success: false, error: 'DVSA API rate limit reached. Please try again shortly.', code: 'RATE_LIMITED' };
  }

  if (!res.ok) {
    let msg = `DVSA API error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.errorMessage) msg += `: ${body.errorMessage}`;
    } catch {}
    return { success: false, error: msg, code: `HTTP_${res.status}` };
  }

  let data: DvsaVehicleResponse;
  try {
    data = await res.json();
  } catch {
    return { success: false, error: 'Invalid response from DVSA API', code: 'PARSE_ERROR' };
  }

  // Pull latest test
  const tests = data.motTests ?? [];
  const latest = tests[0]; // sorted newest-first by API

  const rfrItems = latest?.rfrAndComments ?? [];

  const advisories = rfrItems
    .filter(r => r.type === 'ADVISORY')
    .map(r => r.text);

  const failures = rfrItems
    .filter(r => r.type === 'MAJOR' || r.type === 'DANGEROUS' || r.type === 'MINOR')
    .map(r => `[${r.type}] ${r.text}`);

  const engineCc = data.engineSize ? parseInt(data.engineSize, 10) : undefined;

  return {
    success: true,
    registration: data.registration,
    make: data.make,
    model: data.model,
    colour: data.primaryColour,
    fuelType: data.fuelType,
    engineSizeCc: engineCc && !isNaN(engineCc) ? engineCc : undefined,
    firstUsedDate: data.firstUsedDate,
    latestTest: latest
      ? {
          testDate: latest.completedDate,
          expiryDate: latest.expiryDate,
          result: latest.testResult,
          mileage: (() => {
            if (!latest.odometerValue || latest.odometerResultType === 'NO_ODOMETER' || latest.odometerResultType === 'UNREADABLE') return undefined;
            const raw = parseInt(latest.odometerValue, 10);
            if (isNaN(raw)) return undefined;
            // Convert km to miles if needed
            return latest.odometerUnit === 'km' ? Math.round(raw * 0.621371) : raw;
          })(),
          mileageUnit: 'mi',
          testNumber: latest.motTestNumber,
          advisories,
          failures,
        }
      : undefined,
    allTests: tests,
  };
}
