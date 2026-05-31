import { NextRequest, NextResponse } from 'next/server';
import { searchMarketPrices } from '@/lib/market-search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get('make');
  const model = searchParams.get('model');
  const year = searchParams.get('year');

  if (!make || !model || !year) {
    return NextResponse.json({ error: 'make, model and year are required' }, { status: 400 });
  }

  if (!process.env.GOOGLE_SEARCH_API_KEY || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
    return NextResponse.json({ error: 'Google Search API credentials not configured' }, { status: 503 });
  }

  try {
    const result = await searchMarketPrices(make, model, parseInt(year));
    console.log('[market] listings found:', result.listings.length, 'prices:', result.prices);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[market/lookup]', err);
    return NextResponse.json({ error: err.message || 'Lookup failed' }, { status: 500 });
  }
}
