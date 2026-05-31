'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, AlertTriangle, Globe } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { MarketSearchResult } from '@/lib/market-search';

interface Props {
  make: string;
  model: string;
  year: number;
  currentValue?: number | null;
  vehicleId: string;
  onValueUpdate?: () => void;
}

export default function MarketPricePanel({ make, model, year, currentValue, vehicleId, onValueUpdate }: Props) {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: MarketSearchResult }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function fetchMarketData() {
    setState({ status: 'loading' });
    try {
      const res = await fetch(
        `/api/market/lookup?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&year=${year}`
      );
      const data = await res.json();
      if (!res.ok) {
        setState({ status: 'error', message: data.error || 'Lookup failed' });
        return;
      }
      setState({ status: 'success', data });
    } catch {
      setState({ status: 'error', message: 'Network error' });
    }
  }

  async function saveAsCurrentValue(value: number) {
    setSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('vehicles')
        .update({ current_value: value, last_valued_date: new Date().toISOString().split('T')[0] })
        .eq('id', vehicleId)
        .eq('owner_id', user.id);

      await supabase.from('valuations').insert({
        vehicle_id: vehicleId,
        owner_id: user.id,
        value,
        source: 'Web Market Search',
        notes: `Average asking price from online listings for ${year} ${make} ${model}`,
        valuation_date: new Date().toISOString().split('T')[0],
      });

      onValueUpdate?.();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base text-chrome-bright">Market Prices</h3>
          <p className="text-xs text-chrome-dim mt-0.5">
            Live listings from PistonHeads, Car & Classic, Collecting Cars &amp; more
          </p>
        </div>
        <button
          onClick={fetchMarketData}
          disabled={state.status === 'loading'}
          className="btn-ghost rounded-lg px-3 py-2 text-xs flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state.status === 'loading' ? 'animate-spin' : ''}`} />
          {state.status === 'idle' ? 'Search Market' : state.status === 'loading' ? 'Searching...' : 'Refresh'}
        </button>
      </div>

      <div className="p-6">
        {state.status === 'idle' && (
          <div className="text-center py-8">
            <Globe className="w-8 h-8 text-chrome-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-chrome-dim mb-2">Search the web for current market prices</p>
            <p className="text-xs text-chrome-muted">Scans PistonHeads, Car & Classic, Collecting Cars, AutoTrader and more</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Search failed</p>
              <p className="text-xs text-red-400/70 mt-1">{state.message}</p>
              {state.message.includes('credentials') && (
                <p className="text-xs text-chrome-dim mt-2">
                  Add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID to your .env.local file.
                </p>
              )}
            </div>
          </div>
        )}

        {state.status === 'success' && (
          <div className="space-y-6">
            {/* Price summary */}
            <div className="grid grid-cols-3 gap-3">
              <PriceStat label="Avg Asking" value={state.data.averagePrice} compare={currentValue} />
              <PriceStat label="Lowest Found" value={state.data.lowestPrice} compare={currentValue} />
              <PriceStat label="Highest Found" value={state.data.highestPrice} compare={currentValue} />
            </div>

            {/* Update value prompt */}
            {state.data.averagePrice && (
              <div className="flex items-center justify-between bg-amber-DEFAULT/5 border border-amber-DEFAULT/20 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-chrome-bright">
                    Update current value to{' '}
                    <span className="text-amber-DEFAULT font-mono font-semibold">
                      {formatCurrency(state.data.averagePrice)}
                    </span>?
                  </p>
                  <p className="text-xs text-chrome-dim mt-0.5">
                    Average from {state.data.prices.length} listings found online
                  </p>
                </div>
                <button
                  onClick={() => saveAsCurrentValue(state.data.averagePrice!)}
                  disabled={saving || saved}
                  className="btn-amber rounded-lg px-4 py-2 text-xs shrink-0 ml-4 disabled:opacity-60"
                >
                  {saved ? '✓ Saved' : saving ? 'Saving...' : 'Update Value'}
                </button>
              </div>
            )}

            {/* Listings */}
            {state.data.listings.length > 0 ? (
              <div>
                <h4 className="text-xs font-semibold text-chrome-dim uppercase tracking-wider mb-3">
                  Listings Found ({state.data.listings.length})
                </h4>
                <div className="space-y-2">
                  {state.data.listings.map((listing, i) => (
                    <a
                      key={i}
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-4 p-3 rounded-lg bg-white/2 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-semibold text-amber-DEFAULT/70 uppercase tracking-wider bg-amber-DEFAULT/10 rounded px-1.5 py-0.5 shrink-0">
                            {listing.source}
                          </span>
                          {listing.displayPrice && (
                            <span className="font-mono text-amber-DEFAULT font-semibold text-sm">
                              {listing.displayPrice}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-chrome-bright truncate">{listing.title}</div>
                        <div className="text-xs text-chrome-dim mt-0.5 line-clamp-2">{listing.snippet}</div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-chrome-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-chrome-dim text-sm">
                No listings found — try a broader search or check the make/model spelling
              </div>
            )}

            <p className="text-xs text-chrome-muted">
              Results from Google Search · {new Date(state.data.fetchedAt).toLocaleTimeString('en-GB')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PriceStat({ label, value, compare }: { label: string; value: number | null; compare?: number | null }) {
  const diff = value && compare ? value - compare : null;
  return (
    <div className="glass-card rounded-lg p-3 bg-white/2">
      <div className="text-[10px] text-chrome-muted uppercase tracking-wider mb-1">{label}</div>
      <div className="font-display text-lg text-chrome-bright">{value ? formatCurrency(value) : '—'}</div>
      {diff !== null && (
        <div className={`text-xs mt-0.5 flex items-center gap-1 ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {diff >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {diff >= 0 ? '+' : ''}{formatCurrency(diff)} vs yours
        </div>
      )}
    </div>
  );
}
