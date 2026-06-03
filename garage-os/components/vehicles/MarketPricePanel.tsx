'use client';

import { ExternalLink } from 'lucide-react';

interface Props {
  make: string;
  model: string;
  year: number;
  engineSizeCc?: number | null;
  mileage?: number | null;
  currentValue?: number | null;
  vehicleId: string;
  onValueUpdate?: () => void;
}

function buildAutotraderUrl(make: string, model: string, year: number, engineSizeCc?: number | null, mileage?: number | null) {
  const params = new URLSearchParams();
  params.set('make', make.toUpperCase());
  params.set('model', model.toUpperCase());
  params.set('year-from', String(year - 1));
  params.set('year-to', String(year + 1));
  if (engineSizeCc) {
    params.set('engine-size-from', String(Math.max(500, engineSizeCc - 200)));
    params.set('engine-size-to', String(engineSizeCc + 200));
  }
  if (mileage) {
    params.set('maximum-mileage', String(Math.max(10000, Math.round(mileage * 1.2 / 1000) * 1000)));
  }
  params.set('postcode', 'SW1A1AA');
  params.set('radius', '1500');
  return `https://www.autotrader.co.uk/car-search?${params.toString()}`;
}

function buildPistonHeadsUrl(make: string, model: string, year: number) {
  const q = encodeURIComponent(`${make} ${model} ${year}`);
  return `https://www.pistonheads.com/classifieds?q=${q}`;
}

function buildCarAndClassicUrl(make: string, model: string, year: number) {
  const q = encodeURIComponent(`${make} ${model} ${year}`);
  return `https://www.carandclassic.com/search/?q=${q}`;
}

function buildCollectingCarsUrl(make: string, model: string) {
  const q = encodeURIComponent(`${make} ${model}`);
  return `https://collectingcars.com/for-sale/?search=${q}`;
}

function buildHagertyUrl(make: string, model: string, year: number) {
  const q = encodeURIComponent(`${year} ${make} ${model}`);
  return `https://www.hagerty.com/valuation-tools/?search=${q}`;
}

const SITES = [
  {
    name: 'AutoTrader',
    description: 'Largest UK used car marketplace',
    color: 'text-orange-400',
    bg: 'bg-orange-500/8 border-orange-500/20 hover:border-orange-500/40',
    url: (make: string, model: string, year: number, cc?: number | null, mi?: number | null) =>
      buildAutotraderUrl(make, model, year, cc, mi),
  },
  {
    name: 'PistonHeads',
    description: 'Performance & sports car classifieds',
    color: 'text-blue-400',
    bg: 'bg-blue-500/8 border-blue-500/20 hover:border-blue-500/40',
    url: (make: string, model: string, year: number) => buildPistonHeadsUrl(make, model, year),
  },
  {
    name: 'Car & Classic',
    description: 'Classic & vintage car marketplace',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/8 border-emerald-500/20 hover:border-emerald-500/40',
    url: (make: string, model: string, year: number) => buildCarAndClassicUrl(make, model, year),
  },
  {
    name: 'Collecting Cars',
    description: 'Curated auction platform',
    color: 'text-purple-400',
    bg: 'bg-purple-500/8 border-purple-500/20 hover:border-purple-500/40',
    url: (make: string, model: string, year: number) => buildCollectingCarsUrl(make, model),
  },
  {
    name: 'Hagerty Valuation',
    description: 'Classic car valuation tool',
    color: 'text-amber-400',
    bg: 'bg-amber-500/8 border-amber-500/20 hover:border-amber-500/40',
    url: (make: string, model: string, year: number) => buildHagertyUrl(make, model, year),
  },
];

export default function MarketPricePanel({ make, model, year, engineSizeCc, mileage }: Props) {
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5">
        <h3 className="font-display text-base text-chrome-bright">Market Search</h3>
        <p className="text-xs text-chrome-dim mt-0.5">
          Search live listings for {year} {make} {model}
          {engineSizeCc ? ` · ${(engineSizeCc / 1000).toFixed(1)}L` : ''}
          {mileage ? ` · ~${mileage.toLocaleString()} miles` : ''}
        </p>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SITES.map(site => (
          <a
            key={site.name}
            href={site.url(make, model, year, engineSizeCc, mileage)}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${site.bg}`}
          >
            <div>
              <div className={`text-sm font-semibold ${site.color}`}>{site.name}</div>
              <div className="text-xs text-chrome-muted mt-0.5">{site.description}</div>
            </div>
            <ExternalLink className={`w-4 h-4 shrink-0 ${site.color} opacity-60`} />
          </a>
        ))}
      </div>
    </div>
  );
}
