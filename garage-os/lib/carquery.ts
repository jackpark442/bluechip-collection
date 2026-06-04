/**
 * CarQuery API — free, no key required
 * https://www.carqueryapi.com/documentation/api-usage/
 * Returns performance specs by make / model / year.
 */

export interface CarQuerySpecs {
  zero_to_sixty?: number;    // seconds
  top_speed_mph?: number;
  kerb_weight_kg?: number;
  body_style?: string;
  seats?: number;
  cylinders?: number;
  wheelbase_mm?: number;
  length_mm?: number;
  width_mm?: number;
  height_mm?: number;
  source: 'carquery';
}

interface CarQueryTrim {
  model_0_to_60_mph?: string;
  model_top_speed_mph?: string;
  model_weight_kg?: string;
  model_body?: string;
  model_seats?: string;
  model_engine_cyl?: string;
  model_wheelbase_mm?: string;
  model_length_mm?: string;
  model_width_mm?: string;
  model_height_mm?: string;
  model_year?: string;
  model_trim?: string;
}

function num(val?: string): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  return isNaN(n) || n === 0 ? undefined : n;
}

function intNum(val?: string): number | undefined {
  const n = num(val);
  return n !== undefined ? Math.round(n) : undefined;
}

export async function fetchCarQuerySpecs(
  make: string,
  model: string,
  year: number
): Promise<CarQuerySpecs | null> {
  try {
    const url = `https://www.carqueryapi.com/api/0.3/?cmd=getTrims&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}&full_results=1`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const trims: CarQueryTrim[] = data?.Trims ?? [];
    if (trims.length === 0) return null;

    // Prefer a trim with the most data filled in
    const scored = trims.map(t => ({
      t,
      score: [t.model_0_to_60_mph, t.model_top_speed_mph, t.model_weight_kg,
              t.model_wheelbase_mm, t.model_length_mm].filter(v => v && v !== '0').length,
    })).sort((a, b) => b.score - a.score);

    const best = scored[0].t;

    return {
      zero_to_sixty: num(best.model_0_to_60_mph),
      top_speed_mph: intNum(best.model_top_speed_mph),
      kerb_weight_kg: intNum(best.model_weight_kg),
      body_style: best.model_body || undefined,
      seats: intNum(best.model_seats),
      cylinders: intNum(best.model_engine_cyl),
      wheelbase_mm: intNum(best.model_wheelbase_mm),
      length_mm: intNum(best.model_length_mm),
      width_mm: intNum(best.model_width_mm),
      height_mm: intNum(best.model_height_mm),
      source: 'carquery',
    };
  } catch {
    return null;
  }
}
