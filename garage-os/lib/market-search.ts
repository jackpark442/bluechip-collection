// Market price search — scrapes Car & Classic directly
// Switches to Google Custom Search when GOOGLE_SEARCH_API_KEY is working

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
  listings: SearchListing[];
  prices: number[];
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  fetchedAt: string;
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
};

function extractPrice(text: string): number | null {
  const match = text.match(/£\s*([\d,]+)/);
  if (match) {
    const value = parseInt(match[1].replace(/,/g, ''));
    if (value >= 500 && value <= 10_000_000) return value;
  }
  return null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function searchCarAndClassic(make: string, model: string, year: number): Promise<SearchListing[]> {
  const query = encodeURIComponent(`${make} ${model}`);
  const url = `https://www.carandclassic.com/search/?q=${query}&country=gb`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];

    const html = await res.text();
    const listings: SearchListing[] = [];

    // Split on listing anchor tags
    const blocks = html.split(/<a\s+href="(\/(?:auctions|l)\/[^"]+)"/);

    for (let i = 1; i < blocks.length - 1 && listings.length < 8; i += 2) {
      const href = blocks[i];
      const block = blocks[i + 1];

      const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      if (!titleMatch) continue;
      const title = stripTags(titleMatch[1]);
      if (!title || title.length < 4) continue;

      // Only include if it matches the make
      if (!title.toLowerCase().includes(make.toLowerCase().split(' ')[0])) continue;

      const priceMatch = block.match(/£[\d,]+/);
      const priceStr = priceMatch?.[0] || '';
      const price = extractPrice(priceStr);

      const specsMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const specs = specsMatch ? stripTags(specsMatch[1]) : '';

      listings.push({
        title,
        url: `https://www.carandclassic.com${href}`,
        snippet: [priceStr, specs].filter(Boolean).join(' · ') || 'View on Car & Classic',
        source: 'Car & Classic',
        price,
        displayPrice: price ? `£${price.toLocaleString('en-GB')}` : null,
      });
    }

    return listings;
  } catch {
    return [];
  }
}

async function searchGoogleCustomSearch(make: string, model: string, year: number): Promise<SearchListing[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY!;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID!;

  const query = encodeURIComponent(`${year} ${make} ${model} for sale UK £`);
  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${query}&num=10&gl=uk&hl=en`
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `Google Search error: ${res.status}`);
  }

  const data = await res.json();

  return (data.items || []).map((item: any) => {
    const combined = `${item.title} ${item.snippet}`;
    const price = extractPrice(combined);
    let source = 'Web';
    try {
      source = new URL(item.link).hostname.replace('www.', '');
    } catch {}

    return {
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source,
      price,
      displayPrice: price ? `£${price.toLocaleString('en-GB')}` : null,
    };
  });
}

export async function searchMarketPrices(
  make: string,
  model: string,
  year: number
): Promise<MarketSearchResult> {
  let listings: SearchListing[] = [];

  // Use Google if credentials are configured and working, else fall back to scraping
  const hasGoogle = process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (hasGoogle) {
    try {
      listings = await searchGoogleCustomSearch(make, model, year);
    } catch (e: any) {
      console.log('[market] Google failed, falling back to scraping:', e.message);
      listings = await searchCarAndClassic(make, model, year);
    }
  } else {
    listings = await searchCarAndClassic(make, model, year);
  }

  const prices = listings
    .map(l => l.price)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);

  const averagePrice = prices.length
    ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length)
    : null;

  return {
    make,
    model,
    year,
    listings,
    prices,
    averagePrice,
    lowestPrice: prices.length ? prices[0] : null,
    highestPrice: prices.length ? prices[prices.length - 1] : null,
    fetchedAt: new Date().toISOString(),
  };
}
