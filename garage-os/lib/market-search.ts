// Market price search — AutoTrader-first via Google Custom Search

export interface SearchListing {
  title: string;
  url: string;
  snippet: string;
  source: string;
  price: number | null;
  displayPrice: string | null;
}

export interface MarketSearchResult {
  make: string;
  model: string;
  year: number;
  engineSizeCc?: number;
  mileage?: number;
  listings: SearchListing[];
  prices: number[];
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  autotraderUrl: string;
  fetchedAt: string;
}

function extractPrice(text: string): number | null {
  if (!text) return null;
  const patterns = [
    /£\s*([\d,]+(?:\.\d{2})?)/,
    /GBP\s*([\d,]+)/i,
    /price[:\s]+(\d[\d,]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1].replace(/,/g, '').split('.')[0]);
      if (value >= 500 && value <= 10_000_000) return value;
    }
  }
  return null;
}

/** Build a direct AutoTrader search URL with all available filters */
function buildAutotraderUrl(make: string, model: string, year: number, engineSizeCc?: number, mileage?: number): string {
  const params = new URLSearchParams();
  params.set('make', make.toUpperCase().replace(/\s+/g, '%20'));
  params.set('model', model.toUpperCase().replace(/\s+/g, '%20'));

  // Year range ±1 year
  params.set('year-from', String(year - 1));
  params.set('year-to', String(year + 1));

  // Engine size range ±200cc
  if (engineSizeCc && engineSizeCc > 0) {
    const lower = Math.max(500, engineSizeCc - 200);
    const upper = engineSizeCc + 200;
    params.set('engine-size-from', String(lower));
    params.set('engine-size-to', String(upper));
  }

  // Mileage upper bound — vehicles with up to 20% more miles
  if (mileage && mileage > 0) {
    const maxMileage = Math.round(mileage * 1.2 / 1000) * 1000; // round to nearest 1000
    params.set('maximum-mileage', String(Math.max(maxMileage, 10000)));
  }

  params.set('postcode', 'SW1A1AA'); // London — nationwide effectively
  params.set('radius', '1500');
  params.set('sort', 'relevance');

  return `https://www.autotrader.co.uk/car-search?${params.toString()}`;
}

async function searchGoogleCustomSearch(
  make: string,
  model: string,
  year: number,
  engineSizeCc?: number,
  mileage?: number,
): Promise<SearchListing[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY!;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID!;

  // Engine size as a human-readable string e.g. "2.0" or "3.5"
  const engineStr = engineSizeCc ? `${(engineSizeCc / 1000).toFixed(1)}` : '';

  // Primary: AutoTrader with full detail. Secondary: broader market.
  const queries = [
    `site:autotrader.co.uk ${make} ${model} ${year}${engineStr ? ` ${engineStr}` : ''}`,
    `${make} ${model} ${year}${engineStr ? ` ${engineStr}` : ''} for sale`,
  ];

  const allItems: any[] = [];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(q)}&num=10&gl=uk&hl=en`
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Google Search error: ${res.status}`);
      }

      const data = await res.json();
      if (data.items?.length) {
        allItems.push(...data.items);
        // If we got AutoTrader results from first query, also run second for extra breadth
        if (q.includes('site:autotrader.co.uk') && data.items.length >= 3) continue;
        break;
      }
    } catch (err) {
      if (allItems.length === 0) throw err; // only rethrow if nothing yet
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const listings: SearchListing[] = [];

  for (const item of allItems) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);

    // Pull price from structured data if available
    const pagemap = item.pagemap || {};
    const offerPrice = pagemap.offer?.[0]?.price || pagemap.product?.[0]?.price || '';
    const metatags = pagemap.metatags?.[0] || {};
    const metaPrice = metatags['og:price:amount'] || metatags['product:price:amount'] || '';

    const combined = `${item.title} ${item.snippet} ${offerPrice} ${metaPrice}`;
    const price =
      extractPrice(offerPrice ? `£${offerPrice}` : '') ||
      extractPrice(metaPrice ? `£${metaPrice}` : '') ||
      extractPrice(combined);

    let source = 'Web';
    try { source = new URL(item.link).hostname.replace('www.', ''); } catch {}

    // Bump AutoTrader listings to the front
    listings.push({
      title: item.title,
      url: item.link,
      snippet: item.snippet || '',
      source,
      price,
      displayPrice: price ? `£${price.toLocaleString('en-GB')}` : null,
    });
  }

  // Sort: AutoTrader first, then by price
  listings.sort((a, b) => {
    const aAt = a.source.includes('autotrader') ? 0 : 1;
    const bAt = b.source.includes('autotrader') ? 0 : 1;
    if (aAt !== bAt) return aAt - bAt;
    if (a.price && b.price) return a.price - b.price;
    return 0;
  });

  return listings;
}

export async function searchMarketPrices(
  make: string,
  model: string,
  year: number,
  engineSizeCc?: number,
  mileage?: number,
): Promise<MarketSearchResult> {
  const autotraderUrl = buildAutotraderUrl(make, model, year, engineSizeCc, mileage);

  const listings = await searchGoogleCustomSearch(make, model, year, engineSizeCc, mileage);

  // Only use prices from listings that actually have prices (exclude nulls)
  const prices = listings
    .map(l => l.price)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  // Trim outliers — remove bottom/top 10% if enough data
  let trimmedPrices = prices;
  if (prices.length >= 5) {
    const trim = Math.floor(prices.length * 0.1);
    trimmedPrices = prices.slice(trim, prices.length - trim);
  }

  const averagePrice = trimmedPrices.length
    ? Math.round(trimmedPrices.reduce((s, p) => s + p, 0) / trimmedPrices.length)
    : null;

  return {
    make,
    model,
    year,
    engineSizeCc,
    mileage,
    listings,
    prices,
    averagePrice,
    lowestPrice: prices.length ? prices[0] : null,
    highestPrice: prices.length ? prices[prices.length - 1] : null,
    autotraderUrl,
    fetchedAt: new Date().toISOString(),
  };
}
