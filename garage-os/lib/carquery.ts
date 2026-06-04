/**
 * Car specs lookup via API Ninjas (https://api-ninjas.com/api/cars)
 * Free tier: 10,000 requests/month — sign up at api-ninjas.com for a key.
 * Set APININJAS_KEY in your .env.local and Vercel environment variables.
 *
 * Returns: cylinders, displacement, drive, fuel_type, transmission, body class.
 * Note: 0-60 / top speed / weight are not available from this API — enter manually.
 */

export interface CarQuerySpecs {
  cylinders?: number;
  body_style?: string;
  seats?: number;
  zero_to_sixty?: number;
  top_speed_mph?: number;
  kerb_weight_kg?: number;
  wheelbase_mm?: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  source: 'api-ninjas';
}

interface ApiNinjasCar {
  cylinders?: number;
  class?: string;
  make?: string;
  model?: string;
  year?: number;
  drive?: string;
  transmission?: string;
  fuel_type?: string;
  city_mpg?: number;
  highway_mpg?: number;
  combination_mpg?: number;
  displacement?: number;
}

export async function fetchCarQuerySpecs(
  make: string,
  model: string,
  year: number
): Promise<CarQuerySpecs | null> {
  const apiKey = process.env.APININJAS_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.api-ninjas.com/v1/cars?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}&limit=1`;
    const res = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data: ApiNinjasCar[] = await res.json();
    if (!data?.length) return null;

    const car = data[0];

    return {
      cylinders: car.cylinders ?? undefined,
      body_style: car.class ?? undefined,
      source: 'api-ninjas',
    };
  } catch {
    return null;
  }
}
