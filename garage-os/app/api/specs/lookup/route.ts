import { NextRequest, NextResponse } from 'next/server';
import { fetchCarQuerySpecs } from '@/lib/carquery';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const make  = searchParams.get('make')?.trim();
  const model = searchParams.get('model')?.trim();
  const year  = parseInt(searchParams.get('year') ?? '');

  if (!make || !model || isNaN(year)) {
    return NextResponse.json({ error: 'make, model and year are required' }, { status: 400 });
  }

  if (!process.env.APININJAS_KEY) {
    return NextResponse.json({ error: 'APININJAS_KEY not configured' }, { status: 503 });
  }

  const specs = await fetchCarQuerySpecs(make, model, year);
  if (!specs) {
    return NextResponse.json({ error: 'No specs found for this vehicle' }, { status: 404 });
  }

  return NextResponse.json(specs);
}
