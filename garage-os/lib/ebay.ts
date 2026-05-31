// eBay Browse API — market price lookup for vehicles

interface EbayTokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: EbayTokenCache | null = null;

async function getEbayToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
    return tokenCache.token;
  }

  const clientId = process.env.EBAY_APP_ID!;
  const clientSecret = process.env.EBAY_CERT_ID!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });

  if (!res.ok) throw new Error(`eBay auth failed: ${res.status}`);

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.token;
}

export interface EbayListing {
  title: string;
  price: number;
  currency: string;
  condition: string;
  url: string;
  image?: string;
  location: string;
  soldDate?: string;
  isSold: boolean;
}

export interface MarketSummary {
  make: string;
  model: string;
  year: number;
  activeListings: EbayListing[];
  soldListings: EbayListing[];
  averageAskingPrice: number | null;
  averageSoldPrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  totalListings: number;
  fetchedAt: string;
}

export async function getMarketPrices(
  make: string,
  model: string,
  year: number
): Promise<MarketSummary> {
  const token = await getEbayToken();

  const query = encodeURIComponent(`${year} ${make} ${model}`);

  // Fetch active listings and recently sold in parallel
  const [activeRes, soldRes] = await Promise.all([
    fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&category_ids=9801&filter=itemLocationCountry:GB&limit=10&sort=price`,
      { headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB' } }
    ),
    fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${query}&category_ids=9801&filter=itemLocationCountry:GB,buyingOptions:{FIXED_PRICE}&limit=10&sort=-endTime`,
      { headers: { 'Authorization': `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_GB' } }
    ),
  ]);

  const [activeData, soldData] = await Promise.all([
    activeRes.ok ? activeRes.json() : { itemSummaries: [] },
    soldRes.ok ? soldRes.json() : { itemSummaries: [] },
  ]);

  function parseListings(items: any[], isSold: boolean): EbayListing[] {
    return (items || [])
      .filter((item: any) => item.price?.value)
      .map((item: any) => ({
        title: item.title,
        price: parseFloat(item.price.value),
        currency: item.price.currency,
        condition: item.condition || 'Unknown',
        url: item.itemWebUrl,
        image: item.image?.imageUrl,
        location: item.itemLocation?.city || item.itemLocation?.country || 'UK',
        isSold,
      }));
  }

  const activeListings = parseListings(activeData.itemSummaries, false);
  const soldListings = parseListings(soldData.itemSummaries, false);
  const allListings = [...activeListings, ...soldListings];

  const prices = allListings.map(l => l.price).filter(p => p > 1000); // filter out parts/accessories
  const averageAskingPrice = activeListings.length
    ? activeListings.reduce((s, l) => s + l.price, 0) / activeListings.length
    : null;
  const averageSoldPrice = soldListings.length
    ? soldListings.reduce((s, l) => s + l.price, 0) / soldListings.length
    : null;

  return {
    make,
    model,
    year,
    activeListings: activeListings.slice(0, 6),
    soldListings: soldListings.slice(0, 6),
    averageAskingPrice: averageAskingPrice ? Math.round(averageAskingPrice) : null,
    averageSoldPrice: averageSoldPrice ? Math.round(averageSoldPrice) : null,
    lowestPrice: prices.length ? Math.min(...prices) : null,
    highestPrice: prices.length ? Math.max(...prices) : null,
    totalListings: (activeData.total || 0),
    fetchedAt: new Date().toISOString(),
  };
}
